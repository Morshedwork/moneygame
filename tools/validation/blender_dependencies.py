"""Read-only PE dependency diagnostic for the portable Blender runtime."""
import pathlib,struct,os
root=pathlib.Path(__file__).resolve().parents[2]/'.runtime/blender/blender-5.1.0-windows-x64'
folders=[root,root/'blender.shared',root/'blender.crt',pathlib.Path(os.environ['SystemRoot'])/'System32']
files={p.name.lower():p for folder in reversed(folders) for p in folder.glob('*.dll')}
class PE:
 def __init__(self,p):
  self.b=p.read_bytes();b=self.b;pe=struct.unpack_from('<I',b,60)[0];opt=pe+24;self.is64=struct.unpack_from('<H',b,opt)[0]==0x20b;dd=opt+(112 if self.is64 else 96);self.export,self.imports=struct.unpack_from('<I',b,dd)[0],struct.unpack_from('<I',b,dd+8)[0];count=struct.unpack_from('<H',b,pe+6)[0];start=opt+struct.unpack_from('<H',b,pe+20)[0];self.sections=[struct.unpack_from('<IIII',b,start+i*40+8) for i in range(count)]
 def off(self,rva):
  for size,va,raw_size,raw in self.sections:
   if va<=rva<va+max(size,raw_size):return raw+rva-va
  return rva
 def u(self,o):return struct.unpack_from('<I',self.b,o)[0]
 def s(self,rva):
  o=self.off(rva);return self.b[o:self.b.index(0,o)].decode('ascii',errors='replace')
 def dependencies(self):
  result=[]
  if not self.imports:return result
  o=self.off(self.imports)
  while self.u(o+12):
   name=self.s(self.u(o+12));th=self.off(self.u(o) or self.u(o+16));syms=[];step=8 if self.is64 else 4
   while True:
    v=struct.unpack_from('<Q' if self.is64 else '<I',self.b,th)[0]
    if not v:break
    syms.append(v&65535 if v>>(63 if self.is64 else 31) else self.s(v+2));th+=step
   result.append((name,syms));o+=20
  return result
 def exports(self):
  if not self.export:return set(),set()
  o=self.off(self.export);base=self.u(o+16);count=self.u(o+20);names=self.u(o+24);funcs=self.off(self.u(o+28));ptr=self.off(self.u(o+32));return {self.s(self.u(ptr+i*4)) for i in range(names)},{base+i for i in range(count) if self.u(funcs+i*4)}
cache={};seen=set();errors=[]
def parse(p):
 if p not in cache:cache[p]=PE(p)
 return cache[p]
def visit(p):
 if p.name.lower() in seen:return
 seen.add(p.name.lower())
 for name,syms in parse(p).dependencies():
  if name.lower().startswith(('api-ms-','ext-ms-')):continue
  dep=files.get(name.lower())
  if dep is None:errors.append(f'{p.name}: missing library {name}');continue
  names,ordinals=parse(dep).exports()
  for sym in syms:
   if (sym not in ordinals if isinstance(sym,int) else sym not in names):errors.append(f'{p.name} -> {dep.name}: missing export {sym}')
  if str(dep).startswith(str(root)):visit(dep)
visit(root/'blender.exe')
print('\n'.join(errors[:80]) or 'No ordinary PE import mismatches found.')
print('Inspected',len(seen),'Blender dependencies')
