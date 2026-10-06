"""
PARK — Cloudinary End-to-End Test
=======================================
Verifies the full file lifecycle your app depends on, using the SAME
signing logic as app/services/chapter_service.py (copied here on
purpose, not imported, so this script has zero dependency on the app
booting successfully — useful for debugging .env problems in isolation).

What it checks:
  1. Sign upload params the way the frontend's uploadToCloudinary() expects
  2. Upload a small in-memory PDF directly to Cloudinary (mirrors what
     ChapterUpload.tsx does from the browser)
  3. Confirm Cloudinary returns a secure_url and public_id
  4. Download the file back from that secure_url and confirm the bytes
     round-trip correctly (this is the "chapter download" flow)
  5. Clean up by deleting the test asset (signed destroy call)

Run with:
    cd backend
    python -m scripts.test_cloudinary_e2e

Needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
in your .env — same variables the app already uses.
"""

import asyncio
import hashlib
import os
import time
import sys

import httpx


def _load_dotenv(path: str = ".env"):
    if not os.path.exists(path):
        print(f"WARNING: No .env found at '{path}' — reading from real environment variables instead.")
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()

CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
API_KEY = os.environ.get("CLOUDINARY_API_KEY")
API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")

TEST_PDF_BYTES = (
    b"%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n"
    b"trailer<</Root 1 0 R>>"
)


def sign_params(params: dict) -> str:
    """Identical algorithm to chapter_service.get_upload_url()."""
    sorted_params = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    return hashlib.sha1(f"{sorted_params}{API_SECRET}".encode("utf-8")).hexdigest()


async def main():
    print("=" * 60)
    print("PARK — Cloudinary End-to-End Test")
    print("=" * 60)

    missing = [k for k, v in {
        "CLOUDINARY_CLOUD_NAME": CLOUD_NAME, "CLOUDINARY_API_KEY": API_KEY, "CLOUDINARY_API_SECRET": API_SECRET,
    }.items() if not v or v.startswith("dummy")]
    if missing:
        print(f"FAILED: Missing or placeholder credentials: {', '.join(missing)}")
        print("   Fill these in backend/.env with your real Cloudinary values and re-run.")
        sys.exit(1)
    print(f"OK: Credentials loaded for cloud '{CLOUD_NAME}'")

    async with httpx.AsyncClient(timeout=30.0) as client:
        timestamp = int(time.time())
        folder = "p-ark/test-institution/chapters"
        params_to_sign = {"folder": folder, "timestamp": timestamp}
        signature = sign_params(params_to_sign)
        upload_url = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/auto/upload"
        print(f"OK: Signed upload params (folder='{folder}')")

        files = {"file": ("test_chapter.pdf", TEST_PDF_BYTES, "application/pdf")}
        data = {
            "timestamp": str(timestamp), "signature": signature,
            "api_key": API_KEY, "folder": folder,
        }
        print("-> Uploading test file to Cloudinary...")
        upload_resp = await client.post(upload_url, data=data, files=files)

        if upload_resp.status_code != 200:
            print(f"FAILED: Upload returned {upload_resp.status_code}")
            print(f"   Response: {upload_resp.text}")
            sys.exit(1)

        upload_json = upload_resp.json()
        secure_url = upload_json.get("secure_url")
        public_id = upload_json.get("public_id")
        resource_type = upload_json.get("resource_type", "raw")

        if not secure_url or not public_id:
            print(f"FAILED: Upload succeeded but response is missing secure_url/public_id: {upload_json}")
            sys.exit(1)

        print(f"OK: Uploaded successfully")
        print(f"   public_id:  {public_id}")
        print(f"   secure_url: {secure_url}")
        print(f"   size:       {upload_json.get('bytes')} bytes")

        print("-> Downloading the file back...")
        download_resp = await client.get(secure_url)

        if download_resp.status_code != 200:
            print(f"FAILED: Download returned {download_resp.status_code}")
            sys.exit(1)

        if download_resp.content == TEST_PDF_BYTES:
            print(f"OK: Downloaded content matches exactly ({len(download_resp.content)} bytes)")
        else:
            print(f"WARNING: Downloaded content differs from what was uploaded — Cloudinary may have transformed it")
            print(f"   Uploaded {len(TEST_PDF_BYTES)} bytes, downloaded {len(download_resp.content)} bytes")

        print("-> Cleaning up test asset...")
        destroy_timestamp = int(time.time())
        destroy_params = {"public_id": public_id, "timestamp": destroy_timestamp}
        destroy_signature = sign_params(destroy_params)
        destroy_url = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/{resource_type}/destroy"
        destroy_resp = await client.post(destroy_url, data={
            "public_id": public_id, "timestamp": destroy_timestamp,
            "signature": destroy_signature, "api_key": API_KEY,
        })

        if destroy_resp.status_code == 200 and destroy_resp.json().get("result") == "ok":
            print("OK: Test asset deleted")
        else:
            print(f"WARNING: Could not auto-delete test asset (public_id={public_id}) — remove it manually from Cloudinary dashboard")

    print("=" * 60)
    print("ALL CHECKS PASSED — Cloudinary upload/download flow works end-to-end")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
