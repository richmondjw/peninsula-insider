import {hash,safeUrl} from './data.mjs';
const radius=6371008.8;
function polygons(geometry){if(geometry?.type==='Polygon')return [geometry.coordinates];if(geometry?.type==='MultiPolygon')return geometry.coordinates;throw new Error('Polygon boundary required');}
function validateRing(ring){if(!Array.isArray(ring)||ring.length<4||ring.length>100000)throw new Error('Invalid ring size');for(const p of ring)if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90)throw new Error('Invalid geographic coordinate');if(ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])throw new Error('Unclosed boundary ring');}
function insideRing([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
function segmentMetres(point,a,b){const rad=Math.PI/180,scaleX=radius*rad*Math.cos(point[1]*rad),scaleY=radius*rad;const ax=(a[0]-point[0])*scaleX,ay=(a[1]-point[1])*scaleY,bx=(b[0]-point[0])*scaleX,by=(b[1]-point[1])*scaleY,dx=bx-ax,dy=by-ay;const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));return Math.hypot(ax+t*dx,ay+t*dy);}
export function classifyPoint(geometry,point,{boundaryBufferMetres=20}={}){
 if(!Array.isArray(point)||point.length!==2||point.some(n=>!Number.isFinite(n))||Math.abs(point[0])>180||Math.abs(point[1])>90)throw new Error('Explicit longitude/latitude required');
 if(!Number.isFinite(boundaryBufferMetres)||boundaryBufferMetres<1)throw new Error('Positive review buffer required');
 const list=polygons(geometry);if(!list.length)throw new Error('Empty boundary');let inside=false,distance=Infinity,vertices=0;
 for(const poly of list){if(!Array.isArray(poly)||!poly.length)throw new Error('Empty polygon');for(const ring of poly){validateRing(ring);vertices+=ring.length;if(vertices>100000)throw new Error('Boundary capacity exceeded');for(let i=1;i<ring.length;i++)distance=Math.min(distance,segmentMetres(point,ring[i-1],ring[i]));}if(insideRing(point,poly[0])&&!poly.slice(1).some(r=>insideRing(point,r)))inside=true;}
 return {state:distance<=boundaryBufferMetres?'boundary-review':inside?'inside':'outside',distanceToBoundaryMetres:Math.round(distance),bufferMetres:boundaryBufferMetres,humanReviewRequired:true,publicationApproved:false};
}
export function assessShireLocation(evidence,point,options={}){
 safeUrl(evidence.url,['opendata.maps.vic.gov.au']);if(evidence.authority!=='official'||hash(evidence.body)!==evidence.hash)throw new Error('Current official boundary snapshot hash required');
 const data=JSON.parse(evidence.body);if(data.type!=='FeatureCollection'||data.numberMatched!==1||data.numberReturned!==1||data.features?.length!==1||data.features[0].properties?.lga_official_name!=='MORNINGTON PENINSULA SHIRE'||data.crs?.properties?.name!=='urn:ogc:def:crs:EPSG::4326')throw new Error('Exact Shire boundary and explicit CRS required');
 const age=(options.now??new Date())-new Date(evidence.retrievedAt);if(!Number.isFinite(age)||age<0||age>30*86400000)throw new Error('Boundary snapshot stale or future-dated');
 return {...classifyPoint(data.features[0].geometry,point,options),boundaryEvidenceId:evidence.id,boundaryHash:evidence.hash,coordinateOrder:'longitude,latitude'};
}
