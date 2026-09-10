"""Rebuild only the village; preserve the previously verified characters and props."""
import os, json
import build_assets as b
path = os.path.join(b.OUT, 'manifest.json')
with open(path, encoding='utf-8') as source: b.manifest = json.load(source)
b.manifest['assets'] = [a for a in b.manifest['assets'] if a['id'] != 'yatai-village']
b.manifest['colliders'] = []
b.environment()
with open(path, 'w', encoding='utf-8') as target: json.dump(b.manifest, target, indent=2)
print('LEAD_JAPAN_VILLAGE_COMPLETE', flush=True)
