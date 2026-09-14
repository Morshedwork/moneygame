"""Regenerate mascot assets only; preserve village and prop exports."""
import json, os
import build_assets as api
from reference_mascots import build_mascot

with open(os.path.join(api.OUT,'manifest.json'),encoding='utf-8') as f:
    api.manifest=json.load(f)
names=['lido','prena','oty','diva']
api.manifest['assets']=[asset for asset in api.manifest['assets'] if asset['id'] not in names]
api.manifest['version']=4
api.manifest['blender']=api.bpy.app.version_string
for name in names:build_mascot(api,name)
with open(os.path.join(api.OUT,'manifest.json'),'w',encoding='utf-8') as f:
    json.dump(api.manifest,f,indent=2)
print('LEAD_REFERENCE_MASCOTS_COMPLETE',flush=True)
