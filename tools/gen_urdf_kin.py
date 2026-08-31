#!/usr/bin/env python3
"""Generate js/urdf-kin.js from the robot's own URDF.

Run from X2_URDF-v1.3.0:
    python3 /path/to/AgiBot_Dashboard/tools/gen_urdf_kin.py > ../AgiBot_Dashboard/js/urdf-kin.js
"""
import xml.etree.ElementTree as ET, json, sys, pathlib

urdf = sys.argv[1] if len(sys.argv) > 1 else "x2_ultra.urdf"
r = ET.parse(urdf).getroot()
J = []
for j in r.iter('joint'):
    o, a = j.find('origin'), j.find('axis')
    g = lambda e, k, d: [round(float(v), 5) for v in ((e.get(k) if e is not None and e.get(k) else d).split())]
    J.append({"n": j.get('name'), "p": j.find('parent').get('link'), "c": j.find('child').get('link'),
              "t": g(o, 'xyz', "0 0 0"), "r": g(o, 'rpy', "0 0 0"),
              "a": (g(a, 'xyz', "0 0 1") if j.get('type') != 'fixed' else None),
              "f": j.get('type') == 'fixed'})

print('"use strict";')
print('/* ' + '='*74)
print('   urdf-kin.js - the X2 kinematic tree, GENERATED from X2_URDF-v1.3.0.')
print('   Regenerate with tools/gen_urdf_kin.py rather than editing by hand.')
print('')
print('   Every joint origin, origin rotation and rotation axis exactly as the')
print('   robot states them. This is what lets the Live figure show the posture')
print('   the robot is actually in instead of an animation: feed it the joint')
print('   state topics and the arms are where the arms really are.')
print('')
print('   It also carries the sensor mounts, which matter more than they look.')
print('   The chest LiDAR is rolled -90 degrees, so raw sensor (x,y,z) lands at')
print('   base (x, z, -y). Plotting the raw cloud as if it were already base')
print('   coordinates turns a top-down view into a side view - which is exactly')
print('   what the LiDAR panels were doing.')
print('   ' + '='*72 + ' */')
print("const URDF_JOINTS = " + json.dumps(J, separators=(',', ':')) + ";")
print('''
/* Static sensor -> base_link transforms, composed through the entire chain
   with every rpy applied (waist and head at zero). */
const SENSOR_TF = {
  lidar_chest_front: {
    /* sensor +x -> base +x,  +y -> base -z,  +z -> base +y */
    map: (x, y, z) => [x + 0.1026, z, -y + 0.3367],
  },
  rgbd_head_front: {
    map: (x, y, z) => [0.6428 * y + 0.7661 * z + 0.0660,
                       x - 0.0112,
                       0.7661 * y - 0.6428 * z + 0.5050],
  },
};''')
