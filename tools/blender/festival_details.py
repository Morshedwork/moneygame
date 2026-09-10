"""Original, modeled Japanese festival details, material-batched by the village exporter."""
import math

def add_festival_details(b):
    wood = b.M['Cedar']; linen = b.M['Cream linen']; indigo = b.M['Blue slate']
    red = b.M['Vermilion']; stone = b.M['Foundation']; gold = b.M['Lantern glow']
    bamboo = b.mat('Bamboo', (.29, .34, .11))
    blossom = b.mat('Pale sakura', (.98, .69, .73))
    # Wagasa-style ribbed umbrellas, away from the board and walking lane.
    for x, z, fabric in [(13, 18, red), (-13, -19, indigo), (23, 9, red)]:
        b.cyl('Umbrella foot', (x, .15, z), .42, .3, stone)
        b.cyl('Bamboo umbrella shaft', (x, 1.9, z), .055, 3.8, wood)
        for i in range(24):
            a = i * math.tau / 24; c = (i+1)*math.tau/24
            edge = (x+math.cos(a)*1.8, 3.15, z+math.sin(a)*1.8)
            tip = (x, 3.95, z)
            verts = [b.at(tip), b.at(edge), b.at((x+math.cos(c)*1.8, 3.15, z+math.sin(c)*1.8))]
            mesh = b.bpy.data.meshes.new('Radial paper umbrella panel'); mesh.from_pydata(verts, [], [(0, 2, 1)]); mesh.update()
            obj = b.bpy.data.objects.new('Wagasa paper panel', mesh); b.bpy.context.collection.objects.link(obj)
            b.finish(obj, 'Wagasa paper panel', linen if i%6==0 else fabric)
            mod = obj.modifiers.new('Paper thickness', 'SOLIDIFY'); mod.thickness = .018
            b.bpy.context.view_layer.objects.active = obj; obj.select_set(True)
            b.bpy.ops.object.modifier_apply(modifier=mod.name); obj.select_set(False)
            b.beam('Umbrella bamboo rib', tip, edge, .014, wood)
        b.manifest['colliders'].append({'x': x, 'z': z, 'w': .85, 'd': .85})
    # Low bamboo screens provide a garden edge without closing the main route.
    for x, z in [(30, -9), (30, -14), (-30, -6), (-30, -1)]:
        for i in range(15):
            zz=z-1.75+i*.25
            b.cyl('Bamboo garden screen', (x, 1.05, zz), .045, 2.1, bamboo, 8)
            for y in [.45, 1.2, 1.85]: b.cyl('Bamboo growth node', (x, y, zz), .055, .035, linen, 8)
        for y in [.45, 1.65]: b.beam('Screen timber tie', (x-.06,y,z-1.9), (x-.06,y,z+1.9), .035, wood)
        b.manifest['colliders'].append({'x': x, 'z': z, 'w': .22, 'd': 4})
    # Stone garden lights frame the entry, not the spawn or its forward route.
    for x, z in [(-4.8, 21), (4.8, 21), (23, -13), (-24, -9)]:
        b.box('Garden lantern plinth', (x,.18,z), (.75,.36,.75), stone,.08)
        b.cyl('Stone lantern stem', (x,.8,z), .17, 1.05, stone)
        b.box('Stone light floor', (x,1.31,z), (.7,.16,.7), stone)
        b.box('Garden light paper', (x,1.62,z), (.43,.47,.43), gold)
        for dx in [-.28,.28]:
            for dz in [-.28,.28]: b.box('Stone light frame', (x+dx,1.65,z+dz), (.09,.65,.09), stone,.01)
        b.box('Stone lantern pagoda cap', (x,1.99,z), (.98,.18,.98), indigo,.08)
        b.sphere('Stone finial', (x,2.17,z), (.13,.17,.13), stone, 10, 6)
        b.manifest['colliders'].append({'x': x, 'z': z, 'w': .85, 'd': .85})
    # Clear festival street signs on textile banners, with the LEAD brand colors.
    for x,z,label,fabric in [(-8,21,'YATAI',indigo),(8,21,'FESTIVAL',red),(-23,11,'BENTO',indigo),(23,-8,'CREATE',red)]:
        b.cyl('Festival banner post', (x,2.2,z), .045, 4.4, wood)
        b.beam('Banner crossbar', (x-.15,4.15,z), (x+1.1,4.15,z), .04, wood)
        b.box('Festival fabric banner', (x+.5,3.1,z), (.96,2.0,.045), fabric,.014)
        b.text('Banner lettering', label, (x+.5,3.25,z+.035), .16, linen)
        b.star('Banner star emblem', x+.5,2.72,z+.065,.21,gold)
    # Pale flower clusters on existing cherry trees; no new trunk collisions.
    for x,z in [(-7,5),(7,5),(-6,-4),(6,-5)]:
        for i in range(13):
            a=i*2.399; radius=.65+(i%3)*.4
            b.sphere('Sakura flower cloud', (x+math.cos(a)*radius,3.05+(i%4)*.27,z+math.sin(a)*radius),
                     (.51,.39,.48), blossom, 10, 6)
    b.manifest['environment_theme'] = 'Japan-inspired yatai festival: noren, shoji lattice, wagasa, bamboo, stone lanterns, sakura'
