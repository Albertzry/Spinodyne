"""
MinIO 集成测试脚本
用于验证 MinIO 存储功能是否正常工作
"""
import asyncio
import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.storage import (
    ensure_bucket_exists,
    upload_file,
    download_to_local,
    get_presigned_url,
    list_objects,
    object_exists,
    delete_object
)
from app.core.config import settings


async def test_minio_integration():
    """测试 MinIO 集成功能"""
    
    print("=" * 60)
    print("MinIO 集成测试")
    print("=" * 60)
    
    # 1. 确保 bucket 存在
    print("\n[1/6] 检查 bucket 是否存在...")
    try:
        ensure_bucket_exists()
        print(f"✅ Bucket '{settings.MINIO_BUCKET}' 已就绪")
    except Exception as e:
        print(f"❌ Bucket 初始化失败: {e}")
        return
    
    # 2. 创建测试文件
    print("\n[2/6] 创建测试文件...")
    test_file_path = "/tmp/test_upload.txt"
    test_content = "这是一个 MinIO 测试文件\nMinIO Integration Test\n"
    
    with open(test_file_path, "w") as f:
        f.write(test_content)
    print(f"✅ 测试文件已创建: {test_file_path}")
    
    # 3. 上传文件
    print("\n[3/6] 上传文件到 MinIO...")
    object_name = "test/test_upload.txt"
    try:
        await upload_file(test_file_path, object_name, "text/plain")
        print(f"✅ 文件已上传: {object_name}")
    except Exception as e:
        print(f"❌ 上传失败: {e}")
        return
    
    # 4. 检查文件是否存在
    print("\n[4/6] 检查文件是否存在...")
    try:
        exists = await object_exists(object_name)
        if exists:
            print(f"✅ 文件存在于 MinIO: {object_name}")
        else:
            print(f"❌ 文件不存在: {object_name}")
            return
    except Exception as e:
        print(f"❌ 检查失败: {e}")
        return
    
    # 5. 生成预签名 URL
    print("\n[5/6] 生成预签名 URL...")
    try:
        url = await get_presigned_url(object_name)
        print(f"✅ 预签名 URL 已生成:")
        print(f"   {url[:100]}...")
    except Exception as e:
        print(f"❌ URL 生成失败: {e}")
        return
    
    # 6. 下载文件
    print("\n[6/6] 下载文件到本地...")
    download_path = "/tmp/test_download.txt"
    try:
        await download_to_local(object_name, download_path)
        
        # 验证下载的内容
        with open(download_path, "r") as f:
            downloaded_content = f.read()
        
        if downloaded_content == test_content:
            print(f"✅ 文件下载成功且内容一致: {download_path}")
        else:
            print(f"❌ 文件内容不一致")
            return
    except Exception as e:
        print(f"❌ 下载失败: {e}")
        return
    
    # 清理测试文件
    print("\n[清理] 删除测试对象...")
    try:
        await delete_object(object_name)
        print(f"✅ 测试对象已删除: {object_name}")
    except Exception as e:
        print(f"⚠️ 清理失败: {e}")
    
    # 清理本地文件
    try:
        os.remove(test_file_path)
        os.remove(download_path)
        print(f"✅ 本地测试文件已清理")
    except Exception as e:
        print(f"⚠️ 本地文件清理失败: {e}")
    
    print("\n" + "=" * 60)
    print("✅ 所有测试通过！MinIO 集成正常工作")
    print("=" * 60)


async def list_all_objects():
    """列出所有对象"""
    print("\n查询 bucket 中的所有对象...")
    try:
        objects = await list_objects()
        if objects:
            print(f"找到 {len(objects)} 个对象:")
            for obj in objects:
                print(f"  - {obj}")
        else:
            print("Bucket 为空")
    except Exception as e:
        print(f"❌ 查询失败: {e}")


if __name__ == "__main__":
    print(f"\nMinIO 配置:")
    print(f"  Endpoint: {settings.MINIO_ENDPOINT}")
    print(f"  Bucket: {settings.MINIO_BUCKET}")
    print(f"  Secure: {settings.MINIO_SECURE}")
    
    # 运行测试
    asyncio.run(test_minio_integration())
    
    # 列出所有对象 (可选)
    # asyncio.run(list_all_objects())
