/* BOM backend bridge hotfix - 20260608s */
(function(w){
  try{
    if(typeof APP_CONFIG!=='undefined'){
      APP_CONFIG.BUILD='bom20260608s';
      APP_CONFIG.BOM_BACKEND_URL='https://bom-resolver.onrender.com';
      APP_CONFIG.CAN_USE_ENOVIA_API=true;
      APP_CONFIG.PILOT_GRID_FIRST=true;
      APP_CONFIG.USE_API_SCAN_FIRST=false;
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH=false;
      APP_CONFIG.AUTO_SYNC_PREFER_API=false;
      APP_CONFIG.MANUAL_API_FALLBACK=true;
      APP_CONFIG.API_ENG_BOM_FIRST=true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK=false;
      APP_CONFIG.PRESERVE_OCCURRENCE_ROWS=true;
    }
    function expected(){
      try{if(typeof ProductExplorerBridge!=='undefined'&&ProductExplorerBridge.getExplorerObjectCount)return ProductExplorerBridge.getExplorerObjectCount()||0;}catch(e){}
      try{if(typeof ExplorerContext!=='undefined'&&ExplorerContext.refresh){var c=ExplorerContext.refresh(true);return c&&c.expectedCount||0;}}catch(e2){}
      return 0;
    }
    function ctx(){try{return typeof ExplorerContext!=='undefined'&&ExplorerContext.refresh?ExplorerContext.refresh(true):{};}catch(e){return {};}}
    function rootName(){var c=ctx();return c.rootName||c.productName||'';}
    function physicalId(){var c=ctx();return c.physicalId||c.physicalid||'';}
    function count(r){if(!r)return 0;if(r.meta&&r.meta.itemCount)return r.meta.itemCount||0;if(r.actualCount)return r.actualCount;try{return BomService&&BomService.getNodeCount?BomService.getNodeCount():0;}catch(e){return 0;}}
    function backendPayload(){return{spaceUrl:(typeof CompassServices!=='undefined'&&CompassServices.getVerifiedSpaceUrl?CompassServices.getVerifiedSpaceUrl():'')||'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia',securityContext:(typeof APP_CONFIG!=='undefined'&&APP_CONFIG.SECURITY_CONTEXT)||'',physicalId:physicalId(),rootName:rootName(),expectedCount:expected()};}
    function callBackend(){
      var base=APP_CONFIG&&APP_CONFIG.BOM_BACKEND_URL;
      if(!base||!w.fetch)return Promise.reject(new Error('Backend BOM Resolver indisponível.'));
      if(!physicalId()&&!rootName())return Promise.reject(new Error('Sem seleção para backend.'));
      if(typeof App!=='undefined'&&App.setStatus)App.setStatus('Consultando BOM Resolver backend…','info');
      return fetch(base.replace(/\/$/,'')+'/api/bom/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(backendPayload())}).then(function(res){return res.json().then(function(json){json.httpStatus=res.status;return json;});}).then(function(json){
        w.__BOM_BACKEND_LAST__=json;
        if(!json||!Array.isArray(json.items)||!json.items.length)throw new Error((json&&json.error)||(json&&json.message)||'Backend sem itens.');
        if(typeof BomSnapshot==='undefined'||!BomSnapshot.applyPayload)throw new Error('BomSnapshot indisponível para backend.');
        var payload={productName:(json.root&&json.root.title)||rootName()||'E-BOM',rootPhysicalId:(json.root&&json.root.resolvedId)||physicalId(),items:json.items.map(function(it){return{level:it.level||0,title:it.title||'',name:it.title||'',description:it.description||'',revision:it.revision||'',owner:it.owner||'',maturity:it.maturity||'',state:it.maturity||'',type:it.type||'',physicalid:it.resolvedId||it.physicalId||it.referencedObjectId||'',occurrenceId:it.occurrenceId||'',parentRowId:it.parentRowId||''};})};
        return BomSnapshot.applyPayload(payload).then(function(meta){return{ok:json.ok===true,mode:'backend',loaderMode:'backend',meta:meta,partial:json.status!=='complete',backend:json,message:'Backend '+(json.actualCount||meta.itemCount)+'/'+(json.expectedCount||expected())+' — '+(payload.productName||'E-BOM')};});
      });
    }
    function localPreview(err){
      w.__BOM_BACKEND_ERROR__=err&&err.message?err.message:String(err||'');
      if(typeof App!=='undefined'&&App.setStatus)App.setStatus('Backend indisponível; usando prévia API local…','info');
      if(ExplorerScanner&&ExplorerScanner.scanViaApi&&ExplorerScanner.resolveSelection){return ExplorerScanner.resolveSelection().then(function(sel){return ExplorerScanner.scanViaApi(sel).then(function(r){r.loaderMode='api-preview';r.mode='api-preview';r.partial=expected()>0&&count(r)!==expected();r.message='Prévia API '+count(r)+(expected()?'/'+expected():'')+' — backend/autenticação pendente';return r;});});}
      return Promise.reject(err||new Error('Sem fallback API local.'));
    }
    if(typeof ExplorerContext!=='undefined')ExplorerContext.suggestLoaderMode=function(){return 'backend';};
    if(typeof ExplorerScanner!=='undefined'&&!ExplorerScanner.__BOM20260608S_SCAN_PATCHED__){
      var original=ExplorerScanner.scan&&ExplorerScanner.scan.bind(ExplorerScanner);
      ExplorerScanner.scan=function(){
        return callBackend().catch(function(e){
          return localPreview(e).catch(function(){return original?original():Promise.reject(e);});
        });
      };
      ExplorerScanner.__BOM20260608S_SCAN_PATCHED__=true;
    }
    w.__BOM_BUILD_ID__='bom20260608s';
    w.__BOM_HOTFIX_MODE__='render-backend-with-api-preview-fallback';
  }catch(e){w.__BOM_HOTFIX_ERROR__=e&&e.message?e.message:String(e);}
})(typeof window!=='undefined'?window:this);
