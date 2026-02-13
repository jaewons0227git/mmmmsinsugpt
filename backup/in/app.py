import webview
import requests
import os
import sys
import subprocess
import tempfile
import json
from packaging import version

CURRENT_VERSION = "1.0"
VERSION_URL = "https://raw.githubusercontent.com/jaewons0227git/minsugpt-updater/main/version.json"

# ==========================
# 🔹 데이터 경로: AppData\Local\MinsuGPT\data
# ==========================
APPDATA_DIR = os.path.join(os.environ.get("LOCALAPPDATA"), "MinsuGPT")
DATA_DIR = os.path.join(APPDATA_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)  # 없으면 생성
DATA_FILE = os.path.join(DATA_DIR, "local_storage.json")


# ==========================
# 🔹 업데이트 기능
# ==========================
def check_update():
    try:
        r = requests.get(VERSION_URL, timeout=5)
        data = r.json()
        latest_version = data["version"]
        download_url = data["download_url"]

        if version.parse(latest_version) > version.parse(CURRENT_VERSION):
            download_and_update(download_url)

    except Exception:
        pass


def download_and_update(url):
    try:
        response = requests.get(url, stream=True)
        temp_dir = tempfile.gettempdir()
        installer_path = os.path.join(temp_dir, "MinsuGPT_Update.exe")

        with open(installer_path, "wb") as f:
            for chunk in response.iter_content(1024):
                if chunk:
                    f.write(chunk)

        subprocess.Popen(installer_path, shell=True)
        sys.exit()

    except Exception:
        pass

# ==========================
# 🔹 로컬 저장/복원 + 브리지
# ==========================
class API:
    def __init__(self):
        if not os.path.exists(DATA_FILE):
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump({}, f)

    def save_data(self, key: str, value: str):
        """웹에서 LocalStorage 데이터를 저장 요청"""
        if not os.path.exists(DATA_FILE):
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump({}, f)
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        data[key] = value
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return f"Saved {key} = {value}"

    def load_data(self, key: str):
        """웹에서 특정 키 요청"""
        if not os.path.exists(DATA_FILE):
            return ""
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get(key, "")

# ==========================
# 🔹 앱 실행
# ==========================
if __name__ == "__main__":
    check_update()

    api = API()

    window = webview.create_window(
        "MinsuGPT",
        "https://minsugpt.kro.kr/",  # 호스팅된 웹페이지
        width=1200,
        height=800,
        js_api=api
    )

    # ==========================
    # 🔹 앱 시작 시 LocalStorage 복원
    # ==========================
    def restore_localstorage():
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            for key, value in data.items():
                js_code = f"localStorage.setItem('{key}', '{value}');"
                window.evaluate_js(js_code)
            # 데이터 주입 후 체크 함수 실행
            window.evaluate_js("if(typeof checkRedirect === 'function') checkRedirect();")

    # 웹뷰 시작 + 복원 (window 인자는 제거하여 전역 window 사용)
    webview.start(restore_localstorage)