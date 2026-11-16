import argparse, base64, hashlib, json
from pathlib import Path
from pypdf import PdfReader
from io import BytesIO
parser=argparse.ArgumentParser(description='Extract a bounded public PDF snapshot for private, page-linked review. No publication or approval.')
parser.add_argument('snapshot');parser.add_argument('output');args=parser.parse_args()
evidence=json.loads(Path(args.snapshot).read_text(encoding='utf-8-sig'))
raw=base64.b64decode(evidence['base64'],validate=True)
if not raw.startswith(b'%PDF-') or len(raw)>20000000 or hashlib.sha256(raw).hexdigest()!=evidence['hash']:raise ValueError('Invalid or altered PDF evidence')
reader=PdfReader(BytesIO(raw),strict=True)
if reader.is_encrypted:raise ValueError('Encrypted PDF requires manual access review')
if len(reader.pages)>50:raise ValueError('PDF exceeds page limit')
pages=[{'page':index+1,'text':page.extract_text() or ''} for index,page in enumerate(reader.pages)]
if sum(len(page['text']) for page in pages)>200000:raise ValueError('PDF exceeds extracted text limit')
body='\n'.join('PAGE '+str(page['page'])+'\n'+page['text'] for page in pages)
result={**{key:evidence[key] for key in ['sourceId','url','retrievedAt','authority','lineage']},'id':hashlib.sha256((evidence['id']+body).encode()).hexdigest(),'parentEvidenceId':evidence['id'],'parentHash':evidence['hash'],'body':body,'pages':pages,'extractionMethod':'pypdf','contentType':'application/pdf-derived-text','reviewStatus':'unverified-extraction','visualReviewRequired':True,'approvedForPublication':False}
Path(args.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'pages':len(pages),'evidenceId':result['id'],'publicationApproved':False}))
