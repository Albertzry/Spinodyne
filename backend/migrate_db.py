"""
数据库迁移脚本 - 从旧 Task 模型迁移到新模型

此脚本帮助你将现有的 Task 数据迁移到新的数据库结构
"""
import sys
from sqlmodel import Session, create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)


def check_old_table_exists():
    """检查旧表是否存在"""
    with Session(engine) as session:
        result = session.exec(
            text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'task'
                );
            """)
        ).first()
        return result


def backup_old_data():
    """备份旧数据到临时表"""
    print("正在备份旧数据...")
    with Session(engine) as session:
        # 创建备份表
        session.exec(text("""
            DROP TABLE IF EXISTS task_backup;
            CREATE TABLE task_backup AS SELECT * FROM task;
        """))
        session.commit()
        
        # 统计备份的记录数
        count = session.exec(text("SELECT COUNT(*) FROM task_backup")).first()
        print(f"✅ 已备份 {count} 条记录到 task_backup 表")


def drop_old_table():
    """删除旧表"""
    print("正在删除旧表...")
    with Session(engine) as session:
        session.exec(text("DROP TABLE IF EXISTS task CASCADE;"))
        session.commit()
        print("✅ 旧表已删除")


def create_new_table():
    """创建新表结构"""
    print("正在创建新表结构...")
    from sqlmodel import SQLModel
    from app.models.task import Task
    
    SQLModel.metadata.create_all(engine)
    print("✅ 新表已创建")


def migrate_data():
    """将数据从备份表迁移到新表"""
    print("正在迁移数据...")
    
    with Session(engine) as session:
        # 检查备份表是否有数据
        count = session.exec(text("SELECT COUNT(*) FROM task_backup")).first()
        
        if count == 0:
            print("⚠️  备份表为空，跳过数据迁移")
            return
        
        print(f"准备迁移 {count} 条记录...")
        
        # 迁移数据 - 需要手动映射字段
        # 注意: 这个脚本假设旧数据的 uid 可以作为新的 id
        # 如果需要生成新的 UUID，可以使用 gen_random_uuid()
        
        session.exec(text("""
            INSERT INTO task (
                id,
                patient_name,
                patient_id,
                study_date,
                status,
                created_at,
                finished_at,
                raw_file_key,
                result_files,
                report_data,
                input_file_path,
                output_dir_path
            )
            SELECT 
                uid,                                    -- 使用旧的 uid 作为新的 id
                'Unknown',                              -- 默认患者名称
                'MIGRATED-' || uid,                     -- 生成患者 ID
                CURRENT_DATE,                           -- 默认检查日期
                status,
                created_at,
                finished_at,
                'tasks/' || uid || '/raw.nii.gz',       -- 构建 MinIO 键
                NULL,                                   -- result_files 需要后续处理
                result_json,                            -- 映射到 report_data
                input_file_path,
                output_dir_path
            FROM task_backup;
        """))
        session.commit()
        
        # 验证迁移结果
        new_count = session.exec(text("SELECT COUNT(*) FROM task")).first()
        print(f"✅ 成功迁移 {new_count} 条记录")


def cleanup_backup():
    """清理备份表"""
    print("\n清理备份表...")
    confirm = input("是否删除备份表 task_backup? (yes/no): ")
    
    if confirm.lower() == "yes":
        with Session(engine) as session:
            session.exec(text("DROP TABLE IF EXISTS task_backup;"))
            session.commit()
            print("✅ 备份表已删除")
    else:
        print("⚠️  保留备份表 task_backup (建议在确认数据正确后手动删除)")


def full_migration():
    """完整的迁移流程"""
    print("=" * 60)
    print("数据库迁移工具")
    print("=" * 60)
    print("\n⚠️  警告: 此操作将修改数据库结构")
    print("请确保已经备份了数据库\n")
    
    confirm = input("是否继续? (yes/no): ")
    if confirm.lower() != "yes":
        print("❌ 迁移已取消")
        return
    
    try:
        # 检查旧表
        if not check_old_table_exists():
            print("⚠️  旧表不存在，将直接创建新表")
            create_new_table()
            return
        
        # 执行迁移步骤
        backup_old_data()
        drop_old_table()
        create_new_table()
        migrate_data()
        
        print("\n" + "=" * 60)
        print("✅ 迁移完成！")
        print("=" * 60)
        print("\n注意事项:")
        print("1. 迁移的记录使用了默认的患者信息 (需要后续更新)")
        print("2. raw_file_key 已自动生成，但需要确保 MinIO 中有对应文件")
        print("3. result_files 字段为空，需要运行后处理脚本")
        print("4. 备份表 task_backup 仍然保留，确认数据无误后可删除\n")
        
        cleanup_backup()
        
    except Exception as e:
        print(f"\n❌ 迁移失败: {e}")
        print("请检查错误信息，数据库可能处于不一致状态")
        print("如有备份表，可以手动恢复数据")
        import traceback
        traceback.print_exc()


def fresh_install():
    """全新安装 - 直接创建新表"""
    print("=" * 60)
    print("全新安装 - 创建数据库表")
    print("=" * 60)
    
    confirm = input("这将创建新的数据库表，是否继续? (yes/no): ")
    if confirm.lower() != "yes":
        print("❌ 操作已取消")
        return
    
    create_new_table()
    print("\n✅ 数据库表已创建")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--fresh":
            # 全新安装
            fresh_install()
        elif sys.argv[1] == "--migrate":
            # 迁移现有数据
            full_migration()
        else:
            print("用法:")
            print("  python migrate_db.py --fresh    # 全新安装")
            print("  python migrate_db.py --migrate  # 迁移现有数据")
    else:
        print("用法:")
        print("  python migrate_db.py --fresh    # 全新安装")
        print("  python migrate_db.py --migrate  # 迁移现有数据")
