from sqlmodel import SQLModel, create_engine
from app.core.config import settings
# 导入模型以注册元数据 (非常重要，否则不会创建表)
from app.models.task import Task 

# 这里的 DATABASE_URL 需要和你 config.py 里的一致
# 如果 config.py 里是用 settings 读取的，可以直接用 settings.DATABASE_URL
# 这里为了保险，我手动写一下，你确认一下你的 config.py
DATABASE_URL = "postgresql://spinodyne_user:TotalSpine2026@localhost/spinodyne_db"

engine = create_engine(DATABASE_URL)

def init_db():
    SQLModel.metadata.create_all(engine)
    print("✅ 数据库表创建成功！(Tables created successfully)")

if __name__ == "__main__":
    init_db()
