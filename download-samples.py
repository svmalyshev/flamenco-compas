"""Rebuild the active CC0 sound bank. Python 3 + FFmpeg; --offline uses bundled originals."""
import argparse
from array import array
import base64
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import wave
ROOT = Path(__file__).resolve().parent

def fetch(url, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'FlamencoCompas/1.0'})
    with urllib.request.urlopen(req, timeout=45) as response:
        destination.write_bytes(response.read())

def read_mono(path):
    with tempfile.TemporaryDirectory() as directory:
        decoded = Path(directory) / 'decoded.wav'
        subprocess.run([shutil.which('ffmpeg') or 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(path), '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', str(decoded)], check=True)
        with wave.open(str(decoded), 'rb') as wav:
            values = array('h', wav.readframes(wav.getnframes()))
        if sys.byteorder != 'little': values.byteswap()
        peak = max(abs(v) for v in values)
        if peak == 0: raise ValueError('Silent recording: ' + str(path))
        return [v / peak for v in values]

def prepare(entry):
    recordings = [(read_mono(ROOT / 'assets' / source['local']), source['mix']) for source in entry['source_files']]
    length = max(len(values) for values, _ in recordings)
    mixed = [sum(values[i] * weight for values, weight in recordings if i < len(values)) for i in range(length)]
    peak = max(abs(v) for v in mixed)
    onset = next(i for i, value in enumerate(mixed) if abs(value) >= peak * .015)
    onset = max(0, onset - 44)
    config = entry['processing']
    mixed = mixed[onset:onset + round(config['max_seconds'] * 44100)]
    peak = max(abs(v) for v in mixed)
    fade = min(round(config['fade_seconds'] * 44100), len(mixed))
    output = array('h')
    for i, value in enumerate(mixed):
        envelope = min(1, (len(mixed) - 1 - i) / max(1, fade))
        output.append(round(value / peak * config['peak'] * envelope * 32767))
    if sys.byteorder != 'little': output.byteswap()
    with wave.open(str(ROOT / 'assets' / entry['file']), 'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(44100); wav.writeframes(output.tobytes())

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    entries = json.loads((ROOT / 'assets/sources.json').read_text())
    embedded = {}
    for entry in entries:
        if entry.get('source_files'):
            for source in entry['source_files']:
                local = ROOT / 'assets' / source['local']
                if not args.offline: fetch(source['url'], local)
                if not local.exists(): raise FileNotFoundError(local)
            prepare(entry)
        elif not args.offline:
            fetch(entry['download'], ROOT / 'assets' / entry['file'])
        raw = (ROOT / 'assets' / entry['file']).read_bytes()
        embedded.setdefault(entry['role'], []).append(base64.b64encode(raw).decode())
        print(entry['role'], entry['file'], len(raw), 'bytes')
    (ROOT / 'sample-data.js').write_text('window.COMPAS_SAMPLES = ' + json.dumps(embedded) + ';\n')
if __name__ == '__main__': main()
