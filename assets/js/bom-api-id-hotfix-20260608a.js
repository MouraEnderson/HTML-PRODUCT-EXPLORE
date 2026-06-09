/* BOM browser-auth bridge hotfix - 20260608t */
(function(w){
  try{
    if(typeof APP_CONFIG!=='undefined'){
      APP_CONFIG.BUILD='bom20260608t';
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
    function spaceUrl(){try{if(typeof CompassServices!=='undefined'&&CompassServices.getVerifiedSpaceUrl)return CompassServices.getVerifiedSpaceUrl();}catch(e){}try{if(typeof EnoviaApi!=='undefined'&&EnoviaApi.baseUrl)return EnoviaApi.baseUrl;}catch(e2){}return 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia';}
    function wafGet(path){
      var base=spaceUrl().replace(/\/$/,'');
      var url=path.indexOf('http')===0?path:base+path;
      return new Promise(function(resolve){
        if(!w.WAFData||!WAFData.authenticatedRequest){resolve({ok:false,status:0,error:'WAFData indisponivel',body:null});return;}
        WAFData.authenticatedRequest(url,{method:'GET',type:'json',onComplete:function(data){resolve({ok:true,status:200,body:data});},onFailure:function(err){resolve({ok:false,status:(err&&err.status)||0,error:(err&&err.message)||String(err||'WAF error'),body:err});}});
      });
    }
    function backendPost(path,body){
      var base=APP_CONFIG&&APP_CONFIG.BOM_BACKEND_URL;
      if(!base||!w.fetch)return Promise.reject(new Error('Backend BOM Resolver indisponível.'));
      return fetch(base.replace(/\/$/,'')+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})}).then(function(res){return res.json().then(function(json){json.httpStatus=res.status;return json;});});
    }
    function applyBackendResult(json){
      w.__BOM_BACKEND_LAST__=json;
      if(!json||!Array.isArray(json.items)||!json.items.length)throw new Error((json&&json.error)||(json&&json.message)||'Backend sem itens.');
      if(typeof BomSnapshot==='undefined'||!BomSnapshot.applyPayload)throw new Error('BomSnapshot indisponível para backend.');
      var payload={productName:(json.root&&json.root.title)||rootName()||'E-BOM',rootPhysicalId:(json.root&&json.root.resolvedId)||physicalId(),items:json.items.map(function(it){return{level:it.level||0,title:it.title||'',name:it.title||'',description:it.description||'',revision:it.revision||'',owner:it.owner||'',maturity:it.maturity||'',state:it.maturity||'',type:it.type||'',physicalid:it.resolvedId||it.physicalId||it.referencedObjectId||'',occurrenceId:it.occurrenceId||'',parentRowId:it.parentRowId||''};})};
      return BomSnapshot.applyPayload(payload).then(function(meta){return{ok:json.ok===true,mode:'browser-backend',loaderMode:'browser-backend',meta:meta,partial:json.status!=='complete',backend:json,message:'Browser bridge '+(json.actualCount||meta.itemCount)+'/'+(json.expectedCount||expected())+' — '+(payload.productName||'E-BOM')};});
    }
    function runBrowserBridge(){
      if(!physicalId()&&!rootName())return Promise.reject(new Error('Sem seleção para backend.'));
      if(typeof App!=='undefined'&&App.setStatus)App.setStatus('BOM Resolver browser-auth iniciado…','info');
      return backendPost('/api/bom/browser/start',{physicalId:physicalId(),rootName:rootName(),expectedCount:expected(),maxItems:20000,maxDepth:40}).then(function(job){
        function loop(state){
          w.__BOM_BROWSER_JOB_LAST__=state;
          if(state.status&&state.status!=='running')return applyBackendResult(state);
          var tasks=state.tasks||[];
          if(!tasks.length)return applyBackendResult(state);
          if(typeof App!=='undefined'&&App.setStatus)App.setStatus('Executando tarefas ENOVIA '+(state.actualCount||0)+'/'+(state.expectedCount||expected())+'…','info');
          return Promise.all(tasks.map(function(t){return wafGet(t.path).then(function(r){return{taskId:t.taskId,candidateId:t.candidateId,parent:t.parent,ok:r.ok,status:r.status,error:r.error,body:r.body};});})).then(function(results){return backendPost('/api/bom/browser/continue',{jobId:state.jobId,results:results});}).then(loop);
        }
        return loop(job);
      });
    }
    function localPreview(err){
      w.__BOM_BACKEND_ERROR__=err&&err.message?err.message:String(err||'');
      if(typeof App!=='undefined'&&App.setStatus)App.setStatus('Browser bridge falhou; usando prévia API local…','info');
      if(ExplorerScanner&&ExplorerScanner.scanViaApi&&ExplorerScanner.resolveSelection){return ExplorerScanner.resolveSelection().then(function(sel){return ExplorerScanner.scanViaApi(sel).then(function(r){r.loaderMode='api-preview';r.mode='api-preview';r.partial=expected()>0&&((r.meta&&r.meta.itemCount)||0)!==expected();r.message='Prévia API local — bridge pendente';return r;});});}
      return Promise.reject(err||new Error('Sem fallback API local.'));
    }
    if(typeof ExplorerContext!=='undefined')ExplorerContext.suggestLoaderMode=function(){return 'browser-backend';};
    if(typeof ExplorerScanner!=='undefined'&&!ExplorerScanner.__BOM20260608T_SCAN_PATCHED__){
      var original=ExplorerScanner.scan&&ExplorerScanner.scan.bind(ExplorerScanner);
      ExplorerScanner.scan=function(){return runBrowserBridge().catch(function(e){return localPreview(e).catch(function(){return original?original():Promise.reject(e);});});};
      ExplorerScanner.__BOM20260608T_SCAN_PATCHED__=true;
    }
    w.__BOM_BUILD_ID__='bom20260608t';
    w.__BOM_HOTFIX_MODE__='browser-auth-backend-bridge';
  }catch(e){w.__BOM_HOTFIX_ERROR__=e&&e.message?e.message:String(e);}
})(typeof window!=='undefined'?window:this);
