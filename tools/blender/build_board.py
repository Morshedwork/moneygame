"""The twenty numbered game spaces are real beveled Blender meshes too."""
import os, json
import build_assets as b
from reference_mascots import linear
path=os.path.join(b.OUT,'manifest.json')
with open(path,encoding='utf-8') as source: b.manifest=json.load(source)
b.manifest['assets']=[a for a in b.manifest['assets'] if a['id']!='yatai-board']
b.clear()
palette=[b.mat('Board porcelain '+str(i),linear(color)) for i,color in enumerate(['e8dcff','d9edbc','ffcfcd','cfedfa','fff099'])]
for i in range(20):
    side=i//5; step=i%5
    x,z=[(-10,10-step*4),(-10+step*4,-10),(10,-10+step*4),(10-step*4,10)][side]
    b.box('Board_tile_%02d'%i,(x,.18,z),(3.6,.25,3.6),palette[i%5],.07)
b.export('yatai-board')
with open(path,'w',encoding='utf-8') as target: json.dump(b.manifest,target,indent=2)
print('LEAD_BOARD_COMPLETE',flush=True)
