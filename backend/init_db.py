from sqlmodel import SQLModel, create_engine
from app.core.config import settings
# 导入模型以注册元数据 (非常重要，否则不会创建表)
from app.models.task import Task 

# 使用配置文件中的数据库 URL
engine = create_engine(settings.DATABASE_URL, echo=True)

def init_db():
    """
    初始化数据库表
    - 创建所有 SQLModel 表
    - 自动创建索引 (patient_id, study_date)
    """
    print("正在创建数据库表...")
    SQLModel.metadata.create_all(engine)
    print("✅ 数据库表创建成功！(Tables created successfully)")
    print("\n已创建的表:")
    for table_name in SQLModel.metadata.tables.keys():
        print(f"  - {table_name}")
    print("\n索引:")
    for table in SQLModel.metadata.tables.values():
        for index in table.indexes:
            print(f"  - {index.name}: {[col.name for col in index.columns]}")

def drop_all_tables():
    """
    删除所有表 (谨慎使用！)
    """
    print("⚠️  警告: 即将删除所有表...")
    confirm = input("确认删除所有表? (yes/no): ")
    if confirm.lower() == "yes":
        SQLModel.metadata.drop_all(engine)
        print("✅ 所有表已删除")
    else:
        print("❌ 操作已取消")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--drop":
        drop_all_tables()
    else:
        init_db()
