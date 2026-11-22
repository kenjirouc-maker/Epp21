import re,base64,io,sys
from fontTools import subset
from fontTools.ttLib import TTFont
src=open('/home/user/Epp21/IDK_5.html',encoding='utf-8').read()
# characters actually present anywhere in the file (strip the base64 payloads first)
text=re.sub(r'base64,[A-Za-z0-9+/=]+','',src)
used=set(ch for ch in text if 0x20<=ord(ch)<0x2500)
used|=set(chr(c) for c in range(0x20,0x7F))   # keep all printable ASCII (names, codes, any typed text)
def shrink(raw):
    f=TTFont(io.BytesIO(raw));cm=f.getBestCmap();keep=''.join(sorted(ch for ch in used if ord(ch) in cm))
    opt=subset.Options();opt.flavor='woff2';opt.layout_features=['kern','liga'];opt.hinting=False;opt.desubroutinize=True;opt.name_IDs=[1,2];opt.notdef_outline=True;opt.drop_tables+=['STAT','gasp','GDEF'];opt.glyph_names=False;opt.legacy_kern=False
    s=subset.Subsetter(opt);s.populate(text=keep);s.subset(f);b=io.BytesIO();f.flavor='woff2';f.save(b);return b.getvalue(),len(keep)
def sub(m):
    t=m.group(0);b=re.search(r'base64,([A-Za-z0-9+/=]+)',t);raw=base64.b64decode(b.group(1));new,n=shrink(raw)
    print(re.search(r"font-family:([^;]+)",t).group(1),len(raw),'->',len(new),'glyphs kept',n)
    return t.replace(b.group(1),base64.b64encode(new).decode())
out=re.sub(r'@font-face\{[^}]*\}',sub,src)
open('/tmp/claude-0/-home-user-Epp21/28847139-cde5-5518-883e-6db817bd2aa8/scratchpad/opt/src_fonts.html','w',encoding='utf-8').write(out)
print('file',len(src),'->',len(out))
