import uuid
from datetime import datetime
from azure.cosmos.aio import CosmosClient
from azure.cosmos import exceptions
  
class CosmosDataClient():
    
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

    async def create_data(self, user_name, content = '', tags = []):
        data = {
            'id': str(uuid.uuid4()),  
            'type': 'data',
            'userName': user_name,
            'createdAt': datetime.utcnow().isoformat(),  
            'updatedAt': datetime.utcnow().isoformat(),  
            'title': content,
            'tags': tags
        }
        ## TODO: add some error handling based on the output of the upsert_item call
        resp = await self.container_client.upsert_item(data)  
        if resp:
            return resp
        else:
            return False
    
    async def delete_data(self, data_id, user_id):
        ## get a list of all the messages in the conversation
        messages = await self.get_messages(user_id, data_id)
        response_list = []
        if messages:
            for message in messages:
                resp = await self.container_client.delete_item(item=message['id'], partition_key=user_id)
                response_list.append(resp)
            return response_list


    async def get_datas(self, sort_order='DESC'):
        query = f"SELECT * FROM c WHERE c.type='data' ORDER BY c.updatedAt {sort_order}"
    
        datas = []
        async for item in self.container_client.query_items(query=query, parameters=[]):
            datas.append(item)
    
        return datas

    async def get_data(self, user_id, data_id):
        parameters = [
            {
                'name': '@conversationId',
                'value': data_id
            },
            {
                'name': '@userId',
                'value': user_id
            }
        ]
        query = f"SELECT * FROM c where c.id = @conversationId and c.type='conversation' and c.userId = @userId"
        datas = []
        async for item in self.container_client.query_items(query=query, parameters=parameters):
            datas.append(item)

        ## if no conversations are found, return None
        if len(datas) == 0:
            return None
        else:
            return datas[0]