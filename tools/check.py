from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
from collections import Counter
root=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__(); self.ids=[];self.links=[];self.images=[];self.resources=[];self.fields=[];self.labels=[];self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='a':self.links.append(a.get('href',''))
  if tag=='img':self.images.append(a)
  if tag in ['img','script'] and 'src' in a:self.resources.append(a['src'])
  if tag=='link' and 'href' in a:self.resources.append(a['href'])
  if tag in ['input','select','textarea']:self.fields.append(a)
  if tag=='label':self.labels.append(a.get('for'))
errors=[];pages={p.name:Page(p.read_text()) for p in root.glob('*.html')}
for name,p in pages.items():
 for k,n in Counter(p.ids).items():
  if n>1:errors.append(f'{name}: duplicate ID {k}')
 for href in p.links+p.resources:
  u=urlsplit(href)
  if u.scheme:continue
  target=u.path or name
  if not (root/target).exists():errors.append(f'{name}: missing {target}')
  if u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:errors.append(f'{name}: missing anchor {href}')
 for img in p.images:
  if 'alt' not in img:errors.append(f'{name}: missing alt {img}')
  if 'width' not in img or 'height' not in img:errors.append(f'{name}: missing dimensions {img}')
 for f in p.fields:
  if f.get('id') not in p.labels:errors.append(f'{name}: field without label {f}')
 for url in p.resources:
  if url.startswith('https:'):errors.append(f'{name}: external embedded resource {url}')
 if 'cayenne-' in (root/name).read_text():errors.append(f'{name}: old Porsche image reference')
for f in ['script.js','styles.css']:
 text=(root/f).read_text()
 for term in ['localStorage','sessionStorage','document.cookie','fetch(','XMLHttpRequest']:
  if term in text:errors.append(f'{f}: unexpected storage or network API {term}')
print('\n'.join(errors) if errors else f'OK: {len(pages)} HTML pages, all local files/anchors, image dimensions, form labels, no external embeds, no old Porsche references.')
raise SystemExit(bool(errors))
