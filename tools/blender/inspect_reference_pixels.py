import bpy, numpy as np, os
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
for name in ['Diva.ai.png','Lido vs2.ai.png','Prena.ai.png','Oty.ai.png']:
    img=bpy.data.images.load(os.path.join(root,'public','characters','source',name))
    w,h=img.size
    a=np.empty(w*h*4,dtype=np.float32);img.pixels.foreach_get(a);a=a.reshape(h,w,4)[::-1]
    rgb=np.round(a[:,:,:3]*255).astype(np.uint8)
    samples=rgb[::8,::8].reshape(-1,3);colors,counts=np.unique(samples,axis=0,return_counts=True)
    print(name,w,h,[(list(colors[i]),int(counts[i])) for i in np.argsort(counts)[-6:][::-1]],flush=True)
    mask=np.min(rgb,axis=2)<245
    widths=[]
    for y in range(int(h*.235),int(h*.305)):
        xs=np.flatnonzero(mask[y]);widths.append((int(xs[-1]-xs[0]),y,int(xs[0]),int(xs[-1])))
    best=max(widths);bottom=int(np.flatnonzero(mask.any(axis=1))[-1]);print('HEAD_ROW_AND_FLOOR',best,bottom,flush=True)
