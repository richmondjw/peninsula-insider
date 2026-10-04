"""Review-only topology assessment; never approves towns or event locations."""
import argparse, hashlib, json, sys
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('directory',type=Path)
parser.add_argument('--dependency-path',type=Path)
args=parser.parse_args()
if args.dependency_path: sys.path.insert(0,str(args.dependency_path.resolve()))
from shapely.geometry import shape
boundary_capture=json.loads((args.directory/'shire-boundary.json').read_text(encoding='utf-8'))
locality_capture=json.loads((args.directory/'shire-localities.json').read_text(encoding='utf-8'))
for capture in (boundary_capture,locality_capture):
 evidence=capture['evidence']
 if hashlib.sha256(evidence['body'].encode()).hexdigest()!=evidence['hash']: raise ValueError('Evidence hash mismatch')
boundary=shape(boundary_capture['data']['features'][0]['geometry'])
if not boundary.is_valid: raise ValueError('Invalid captured boundary; do not repair silently')
rows=[]
for feature in locality_capture['data']['features']:
 geometry=shape(feature['geometry'])
 if not geometry.is_valid or geometry.area<=0: raise ValueError('Invalid locality geometry')
 fraction=max(0,min(1,geometry.intersection(boundary).area/geometry.area))
 rows.append({'name':feature['properties']['locality_name'],'overlapFractionApprox':fraction,'state':'boundary-review' if fraction<.01 else 'substantial-overlap','exactVenuePointRequired':True,'publicationApproved':False})
report={'boundaryEvidenceId':boundary_capture['evidence']['id'],'boundaryHash':boundary_capture['evidence']['hash'],'localityEvidenceId':locality_capture['evidence']['id'],'localityHash':locality_capture['evidence']['hash'],'localities':rows,'geographicCompleteness':'review-required','method':'Shapely intersection of captured EPSG:4326 polygons. Fractions use planar degree areas and are approximate; a 1 percent review threshold is an operational heuristic, not a jurisdiction ruling. Every venue requires an exact point check and human confirmation. Bounded localities only; neighbourhoods are not an exhaustive destination inventory.'}
(args.directory/'boundary-review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'substantialOverlap':sum(r['state']=='substantial-overlap' for r in rows),'boundaryReview':[r['name'] for r in rows if r['state']=='boundary-review'],'publicationChanges':[]}))
