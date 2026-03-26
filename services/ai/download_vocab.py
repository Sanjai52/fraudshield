from huggingface_hub import hf_hub_download
import shutil, os

dest = r"C:\Users\Subhiksha\OneDrive - SSN-Institute\0_College\1_Imp\Projects\fraudshield\ml\registry\muril-fraud-v1"

f = hf_hub_download(repo_id="google/muril-base-cased", filename="vocab.txt")
shutil.copy(f, os.path.join(dest, "vocab.txt"))
print("Done — vocab.txt copied!")
