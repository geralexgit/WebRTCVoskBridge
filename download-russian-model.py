#!/usr/bin/env python3
import urllib.request
import zipfile
import os

def download_russian_model():
    model_url = "https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip"
    zip_file = "vosk-model-small-ru-0.22.zip"
    extract_dir = "vosk-model-ru"
    
    if os.path.exists(extract_dir) and os.listdir(extract_dir):
        print("Russian model already exists!")
        return
    
    print("Downloading Russian Vosk model...")
    try:
        urllib.request.urlretrieve(model_url, zip_file)
        print("Download completed!")
        
        print("Extracting model...")
        with zipfile.ZipFile(zip_file, 'r') as zip_ref:
            zip_ref.extractall()
        
        # Rename the extracted directory
        extracted_name = "vosk-model-small-ru-0.22"
        if os.path.exists(extracted_name):
            if os.path.exists(extract_dir):
                import shutil
                shutil.rmtree(extract_dir)
            os.rename(extracted_name, extract_dir)
        
        # Clean up zip file
        os.remove(zip_file)
        print(f"Russian model installed to: {extract_dir}")
        
    except Exception as e:
        print(f"Error downloading Russian model: {e}")
        print("You can manually download it from:")
        print(model_url)

if __name__ == "__main__":
    download_russian_model()