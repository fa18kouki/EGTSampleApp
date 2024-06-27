from langchain.document_loaders import TextLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI
import asyncio

async def generate_response(query):
    # 2. ドキュメントの分割
    text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
    texts = text_splitter.split_documents(documents)

    # 3. ベクトルストアの作成
    embeddings = OpenAIEmbeddings()
    vectorstore = Chroma.from_documents(texts, embeddings)

    # 4. 質問応答チェーンの構築
    qa_chain = RetrievalQA.from_chain_type(
        llm=OpenAI(),
        chain_type="stuff",
        retriever=vectorstore.as_retriever()
    )

    # 5. 質問と回答（ストリーム形式）
    response = await qa_chain.arun(query)
    
    # ストリーム形式で回答を生成
    for char in response:
        yield char
        await asyncio.sleep(0.05)  # 文字ごとに少し遅延を入れる

async def main():
    file_path = "path/to/your/file.txt"
    query = "ファイルの内容に関する質問"
    
    async for char in generate_response(file_path, query):
        print(char, end='', flush=True)

if __name__ == "__main__":
    asyncio.run(main())