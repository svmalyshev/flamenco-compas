"""Import sound resources from the user's local IPA without running the app."""
import base64
import hashlib
import json
from pathlib import Path
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent
ARCHIVE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'Metronomo 1.0.1.ipa'
ROLES = {'soft': 'palmas_sordas_mono.wav', 'hard': 'palmas_agudas_fuertes_mono.wav',
         'bass': 'cajon_grave_mono.wav', 'slap': 'cajon_agudo_mono.wav', 'tap': 'cajon_agudo_mono.wav',
         'double': 'palmas_agudas_dobles_mono.wav', 'pandereta': 'pandereta_mono.wav',
         'softer': 'palmas_sordas_suaves_mono.wav', 'bright': 'palmas_agudas_v2_mono.wav', 'filler': 'palmas_agudas_v2_mono.wav'}
NAMES = ['cajon_agudo_mono.wav', 'cajon_grave_mono.wav', 'palmas_agudas_dobles_mono.wav',
         'palmas_agudas_fuertes_mono.wav', 'palmas_agudas_v2_mono.wav',
         'palmas_sordas_mono.wav', 'palmas_sordas_suaves_mono.wav', 'pandereta_mono.wav', 'palos.json']
destination = ROOT / 'assets/iphone'
destination.mkdir(parents=True, exist_ok=True)
files = []
with ZipFile(ARCHIVE) as archive:
    for name in NAMES:
        raw = archive.read('Payload/metronomo.app/' + name)
        (destination / name).write_bytes(raw)
        files.append({'file': name, 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)})
bank = {role: [base64.b64encode((destination / name).read_bytes()).decode()] for role, name in ROLES.items()}
(ROOT / 'iphone-samples.js').write_text('window.COMPAS_IPHONE_SAMPLES = ' + json.dumps(bank) + ';\n')
palos = json.loads((destination / 'palos.json').read_text())
def build_pattern(palo_name, label, note, practice, clock_index=0):
    palo = next(p for p in palos if p['name'] == palo_name)
    clock = palo['clocks'][clock_index]
    lengths = {sum(palo['compasPatterns'][n]['numberOfTempos'] for n in track['patternSequence']) for track in clock['tracks']}
    if len(lengths) != 1: raise ValueError('Tracks have different durations')
    length = lengths.pop()
    grid = [[] for _ in range(length * 8)]
    kinds = {0: ('bass', 'cajon'), 1: ('slap', 'cajon'), 2: ('bright', 'palmas'),
             3: ('double', 'palmas'), 4: ('hard', 'palmas'), 5: ('pandereta', 'pandereta'),
             6: ('soft', 'palmas'), 7: ('softer', 'palmas')}
    for track in clock['tracks']:
        offset = 0
        for pattern_index in track['patternSequence']:
            pattern = palo['compasPatterns'][pattern_index]
            for instrument in pattern['instruments']:
                if not (len(instrument['tempoHits']) == len(instrument['tempoInstrument']) == len(instrument['tempoIntensities'])):
                    raise ValueError('Mismatched event arrays')
                for position, sound, intensity in zip(instrument['tempoHits'], instrument['tempoInstrument'], instrument['tempoIntensities']):
                    tick = round((offset + position) * 8)
                    if abs(tick - (offset + position) * 8) > 1e-8: raise ValueError('Unsupported timing position')
                    if not 0 <= position < pattern['numberOfTempos']: raise ValueError('Event outside pattern')
                    kind, target = kinds[sound]
                    velocity = instrument['instrumentVolume'] * pattern['generalVolume'] * track['trackVolume'] * clock['tracksGeneralGain'] * 2 ** (-intensity)
                    grid[tick].append({'kind': kind, 'instrument': target, 'velocity': velocity, 'sourceIntensity': intensity, 'sourceSoundIndex': sound})
            offset += pattern['numberOfTempos']
    return {
        'label': label, 'name': label.upper(), 'bpm': clock['defaultBPM'],
        'order': [int(n) if n.isdigit() else n for n in clock['clockNumbers']],
        'accents': [clock['clockNumbers'][i] for i in clock['clockAccents']],
        'accentPositions': clock['clockAccents'], 'tempoFraction': clock['tempoFraction'],
        'note': note, 'practice': practice, 'eventGrid': grid, 'sourceClock': clock['name'], 'sourcePalo': palo_name, 'sourceClockIndex': clock_index,
        'cycleLabel': str(len([n for n in clock['clockNumbers'] if n.isdigit()])) + ' ПОЗИЦИЙ',
        'sourceGainModel': 'instrumentVolume * generalVolume * trackVolume * tracksGeneralGain * 2^(-tempoIntensity); inferred amplitude transfer, not verified against executable',
    }
patterns = {
    'soleaModerno': build_pattern('soleares', 'Soleá',
        'Счёт с 12 · акценты 12, 3, 7, 8, 10',
        'Басовый и высокий кахон, пальмас и короткие дроби. Регуляторы звука позволяют услышать каждую партию отдельно.'),
    'buleriasModerno': build_pattern('Bulerías', 'Bulerías',
        'Счёт с 12 · акценты 12, 3, 7, 8, 10 · Moderno',
        'Moderno: опорные басовые удары на 12, 3, 7, 8 и 10, высокий кахон и пальмас.', 0),
    'buleriasAntigua': build_pattern('Bulerías', 'Bulerías',
        'Счёт с 12 · акценты 12, 3, 6, 8, 10 · Antigua',
        'Antigua: опорные басовые удары на 12, 3, 6, 8 и 10, высокий кахон и пальмас.', 3),
    'tanguillos': build_pattern('tanguillos', 'Tanguillos',
        'Tradicional · счёт 6–1–2–3–4–5',
        'Слушай, как высокий кахон и пальмас переплетаются с басовыми ударами. Два прохода счёта 6–1–2–3–4–5 заполняют круг.'),
}
patterns['buleriasModerno']['outputGain'] = .75
patterns['buleriasAntigua']['outputGain'] = .75
patterns['tanguillos']['outputGain'] = .8
patterns['tanguillos']['cycleLabel'] = 'СЧЁТ 6 + 6'
patterns['tanguillos']['tempoHint'] = 'Один пульс BPM — две позиции на круге'

# Every source clock is imported, including multi-pattern track sequences.
catalog = [
 ('bulerias','Bulerías','Bulerías',['moderno','alGolpe','seisTiempos','antigua','seisOctavos'],['Moderno','Al golpe','En seis tiempos','Antigua','En seis octavos']),
 ('alegrias','Alegrías','Alegrías',None,['Moderno','Antiguo']),
 ('fandangos','fandangos','Fandangos',None,['En doce tiempos','En seis tiempos','En tres tiempos']),
 ('jaleos','jaleos','Jaleos',None,['Tradicional']),
 ('seguiriyas','seguiriyas','Seguiriyas',None,['Tradicional']),
 ('solea','soleares','Soleá',['moderno','antiguo'],['Вариант 1','Вариант 3']),
 ('rumbas','rumbas','Rumbas',None,['Tradicional']),
 ('tangos','tangos','Tangos',None,['Tradicional']),
 ('tientos','tientos','Tientos',None,['Tradicional']),
 ('tanguillos','tanguillos','Tanguillos',None,['Tradicional']),
 ('sevillanas','sevillanas','Sevillanas',None,['Completa','1er tercio','3er tercio']),
 ('palmas','palmas','Palmas',None,['En 2 tiempos','En 3 tiempos','En 4 tiempos','En 6 tiempos','En 12 · moderna','En 12 · antigua']),
]
existing = {('soleares',0):'soleaModerno',('Bulerías',0):'buleriasModerno',('Bulerías',3):'buleriasAntigua',('tanguillos',0):'tanguillos'}
styles = {}
for style, source, label, ids, names in catalog:
    palo = next(p for p in palos if p['name'] == source)
    options = []
    for i, clock in enumerate(palo['clocks']):
        key = existing.get((source,i), style + str(i))
        if key not in patterns:
            patterns[key] = build_pattern(source,label,names[i],
                'Настрой удобный темп и баланс инструментов. Слушай рисунок целиком, затем разбери каждую партию отдельно.',i)
            patterns[key]['outputGain'] = .75
        pattern = patterns[key]
        if style == "alegrias" and i == 0: pattern["outputGain"] = .4  # Headroom for the summed source tracks.
        pattern['cycleLabel'] = ('4 СЧЁТА' if style in ('tangos','rumbas') else
                                 '3 СЧЁТА' if style == 'sevillanas' else pattern['cycleLabel'])
        if style == 'tangos':
            pattern['note'] = 'Счёт 1–2–3–4 · фраза на два круга'
            pattern['practice'] = 'Держи ровный счёт 1–2–3–4. Полный рисунок кахона и пальмас повторяется через два круга.'
        if style == 'sevillanas':
            pattern['note'] = names[i] + ' · ' + str(len(pattern['eventGrid']) // 8) + ' счёта во фразе'
            pattern['practice'] = 'Вступление и паузы входят в последовательность. Дождись завершения всей фразы перед повтором.'
        if style == 'solea' and i == 1: pattern['note'] = 'Счёт с 12 · акценты 12, 3, 6, 8, 10'
        pattern['hasPandereta'] = any(e['instrument'] == 'pandereta' for tick in pattern['eventGrid'] for e in tick)
        options.append({'id':ids[i] if ids else str(i),'label':names[i],'key':key})
    styles[style] = {'label':label,'presets':options}
(ROOT / 'iphone-patterns.js').write_text('window.COMPAS_IPHONE_PATTERNS = ' + json.dumps(patterns, ensure_ascii=False) + ';\nwindow.COMPAS_IPHONE_STYLES = ' + json.dumps(styles, ensure_ascii=False) + ';\n')
for key, pattern in patterns.items():
    (destination / (key + '.json')).write_text(json.dumps(pattern, ensure_ascii=False, indent=2) + '\n')
(destination / 'source.json').write_text(json.dumps({
    'archive':ARCHIVE.name, 'bundle':'com.swissapps.metronomo', 'version':'1.0.1',
    'source':'User-provided local application archive', 'files':files, 'roleMapping':ROLES,
    'normalization':'Original sample levels and onset preserved',
    'patternsImported':[p['sourcePalo'] + ' / ' + p['sourceClock'] for p in patterns.values()],
    'patternLevelMapping':'Inferred exponential intensity attenuation; source event times and complete track sequences copied exactly. Sound indices 3, 6 and 7 inferred from available recordings; not verified against executable.'
},ensure_ascii=False,indent=2) + '\n')
print('Imported',len(patterns),'native patterns across',len(styles),'styles')
