import crypto from 'node:crypto';
const jobs=new Map();
const enc=encodeURIComponent;
function arr(b){return (b&&Array.isArray(b.member))?b.member:[]}
function id(o){return o&&String(o.id||o.identifier||o.physicalid||'')}
function title(o){return String((o&&(o.title||o.displayName||o.name))||'')}
function clean(s){return String(s||'').replace(/\.\d+$/,'').trim()}
function instPath(nav,top=100){return `/resources/v1/modeler/dseng/dseng:EngItem/${enc(nav)}/dseng:EngInstance?$mva=true&$skip=0&$top=${top}&$mask=dsmveng%3AEngInstanceMask.Details&$fields=dsmvcfg%3Aattribute.hasConfiguredInstance`}
function searchPath(q