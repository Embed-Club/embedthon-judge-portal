import os
import re
import json
import subprocess
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX_DIR = os.path.join(ROOT, "assets", "sfx")
REPORT_PATH = os.path.join(ROOT, "qa", "audio_loudnorm_report.json")

def measure_loudnorm(filepath):
    cmd = [
        FFMPEG, "-hide_banner", "-i", filepath,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
        "-f", "null", "-"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", res.stderr, re.S)
    return json.loads(m.group(0)) if m else {}

def normalize_file(filepath):
    before = measure_loudnorm(filepath)
    if not before:
        return {"file": os.path.basename(filepath), "error": "Failed to measure"}

    tmp = filepath + ".norm.mp3"
    if str(before.get("input_i")) in ("-inf", "inf") or str(before.get("target_offset")) in ("-inf", "inf"):
        filt = "loudnorm=I=-16:TP=-1.5:LRA=11"
    else:
        filt = (
            f"loudnorm=I=-16:TP=-1.5:LRA=11:"
            f"measured_I={before['input_i']}:"
            f"measured_TP={before['input_tp']}:"
            f"measured_LRA={before['input_lra']}:"
            f"measured_thresh={before['input_thresh']}:"
            f"offset={before['target_offset']}:linear=true"
        )
    cmd = [
        FFMPEG, "-hide_banner", "-y", "-i", filepath,
        "-af", filt,
        "-ar", "44100", "-ac", "2", "-b:a", "192k",
        tmp
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    os.replace(tmp, filepath)
    after = measure_loudnorm(filepath)
    return {
        "file": os.path.basename(filepath),
        "before_LUFS": before.get("input_i"),
        "before_TP_dBTP": before.get("input_tp"),
        "after_LUFS": after.get("input_i"),
        "after_TP_dBTP": after.get("input_tp"),
    }

def main():
    results = []
    for fname in sorted(os.listdir(SFX_DIR)):
        if fname.lower().endswith(".mp3"):
            results.append(normalize_file(os.path.join(SFX_DIR, fname)))
    with open(REPORT_PATH, "w") as f:
        json.dump(results, f, indent=2)
    for r in results:
        print(f"{r['file']}: {r.get('before_LUFS')} LUFS / {r.get('before_TP_dBTP')} dBTP -> {r.get('after_LUFS')} LUFS / {r.get('after_TP_dBTP')} dBTP")

if __name__ == "__main__":
    main()
