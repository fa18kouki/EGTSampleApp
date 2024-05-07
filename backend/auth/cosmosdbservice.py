import uuid
from datetime import datetime
from azure.cosmos.aio import CosmosClient
from azure.cosmos import exceptions
  
class CosmosUserClient():
    
    def __init__(self, cosmosdb_endpoint: str, credential: any, database_name: str, container_name: str):
        self.cosmosdb_endpoint = cosmosdb_endpoint
        self.credential = credential
        self.database_name = database_name
        self.container_name = container_name
        try:
            self.cosmosdb_client = CosmosClient(self.cosmosdb_endpoint, credential=credential)
        except exceptions.CosmosHttpResponseError as e:
            if e.status_code == 401:
                raise ValueError("Invalid credentials") from e
            else:
                raise ValueError("Invalid CosmosDB endpoint") from e

        try:
            self.database_client = self.cosmosdb_client.get_database_client(database_name)
        except exceptions.CosmosResourceNotFoundError:
            raise ValueError("Invalid CosmosDB database name") 
        
        try:
            self.container_client = self.database_client.get_container_client(container_name)
        except exceptions.CosmosResourceNotFoundError:
            raise ValueError("Invalid CosmosDB container name") 
        

    async def ensure(self):
        if not self.cosmosdb_client or not self.database_client or not self.container_client:
            return False, "CosmosDB client not initialized correctly"
            
        try:
            database_info = await self.database_client.read()
        except:
            return False, f"CosmosDB database {self.database_name} on account {self.cosmosdb_endpoint} not found"
        
        try:
            container_info = await self.container_client.read()
        except:
            return False, f"CosmosDB container {self.container_name} not found"
            
        return True, "CosmosDB client initialized successfully"

    async def create_user(self, user_name, password):
        user = {
            'user_id': str(uuid.uuid4()),  
            'type': 'user',
            'userName': user_name,
            'password': password,
            'createdAt': datetime.utcnow().isoformat(),  
            'updatedAt': datetime.utcnow().isoformat(),
            'admin': False,
            'prompts': [],
        }
        ## TODO: add some error handling based on the output of the upsert_item call
        resp = await self.container_client.upsert_item(user)  
        if resp:
            return resp
        else:
            return False
    
    async def delete_user(self, user_id):
        ## get a list of all the messages in the conversation
        messages = await self.get_messages(user_id, user_id)
        response_list = []
        if messages:
            for message in messages:
                resp = await self.container_client.delete_item(item=message['id'], partition_key=user_id)
                response_list.append(resp)
            return response_list


    async def get_users(self, sort_order='DESC'):
        query = f"SELECT * FROM c WHERE c.type='user' ORDER BY c.updatedAt {sort_order}"
    
        users = []
        async for item in self.container_client.query_items(query=query, parameters=[]):
            users.append(item)
    
        return users

    async def set_prompts(self, user_id, prompt):
        user = await self.get_user(user_id)
        if user:
            user['prompts'].append(prompt)
            resp = await self.container_client.upsert_item(user)
            return resp
        else:
            return False
    
    async def get_user(self, user_id):
        parameters = [
            {
                'name': '@userId',
                'value': user_id
            }
        ]
        query = f"SELECT * FROM c where c.id = @userId and c.type='user'"
        user = []
        async for item in self.container_client.query_items(query=query, parameters=parameters):
            user.append(item)

        ## if no conversations are found, return None
        if len(user) == 0:
            return None
        else:
            return user[0]
        
    async def get_authenticated_user(self, user_id):
        parameters = [
            {
                'name': '@userId',
                'value': user_id
            }
        ]
        query = f"SELECT * FROM c where c.id = @userId and c.type='user'"
        user = []
        async for item in self.container_client.query_items(query=query, parameters=parameters):
            user.append(item)

        ## if no conversations are found, return None
        if len(user) == 0:
            return None
        else:
            return user[0]
 