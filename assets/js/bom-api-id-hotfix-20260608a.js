/* BOM EBOM source-of-truth hotfix - 20260608r */
(function(w){
  try{
    if(typeof APP_CONFIG!=='undefined'){
      APP_CONFIG.BUILD='bom20260608r';
      APP_CONFIG.PRIMARY_LOADER='tsv';
      APP_CONFIG.PILOT_GRID_FIRST=true;
      APP_CONFIG.FAST_TSV_MAX=1000000;
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH=false;
      APP_CONFIG.USE_API_SCAN_FIRST=false;
      APP_CONFIG.AUTO_SYNC_PREFER_API=false;
      APP_CONFIG.MANUAL_API_FALLBACK=false;
      APP_CONFIG.ALLOW_PASTE_FALLBACK=true;
      APP_CONFIG.SKIP_CLIPBOARD_READ=false;
      APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED=true;
      APP_CONFIG.USE_DOM_MIRROR_PRIMARY=true;
      APP_CONFIG.DOM_MIRROR_FALLBACK=true;
      APP_CONFIG.PRESERVE_OCCURRENCE_ROWS=true;
      APP_CONFIG.CAN_USE_ENOVIA_API=true;
      APP_CONFIG.API_ENG_BOM_FIRST=true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK=false;
    }
    function expected(){
      try{if(typeof ProductExplorerBridge!=='undefined'&&ProductExplorerBridge.getExplorerObjectCount)return ProductExplorerBridge.getExplorerObjectCount()||0;}catch(e){}
      try{if(typeof ExplorerContext!=='undefined'&&ExplorerContext.refresh){var c=ExplorerContext.refresh(true);return c&&c.expectedCount||0;}}catch(e2){}
      return 0;
    }
    function resultCount(r){
      if(!r)return 0;
      if(r.meta&&r.meta.itemCount)return r.meta.itemCount||0;
      try{return BomService&&BomService.getNodeCount?BomService.getNodeCount():0;}catch(e){return 0;}
    }
    function good(res){var e=expected(),n=resultCount(res);return !e||n===e;}
    function mark(res,src){if(res){res.mode=src;res.loaderMode=src;}return res;}
    function failMsg(n,e){
      return new Error('E-BOM não carregada: fonte Explorer incompleta '+n+'/'+e+'. Para E-BOM fiel: clique na grade do Product Explorer, Ctrl+A, Ctrl+C e depois Atualizar estrutura. API parcial não será usada como E-BOM final.');
    }
    if(typeof ExplorerContext!=='undefined')ExplorerContext.suggestLoaderMode=function(){return 'tsv';};
    if(typeof ExplorerScanner!=='undefined'&&!ExplorerScanner.__BOM20260608R_SCAN_PATCHED__){
      ExplorerScanner.scan=function(){
        var e=expected();
        function importBest(){
          if(ExplorerScanner.scanViaImportBestEffort)return ExplorerScanner.scanViaImportBestEffort().then(function(r){return mark(r,'explorer-import');});
          if(ExplorerScanner.scanViaClipboardOrPaste)return ExplorerScanner.scanViaClipboardOrPaste().then(function(r){return mark(r,'paste');});
          return Promise.reject(new Error('Importação Explorer indisponível.'));
        }
        function grid(){
          if(ExplorerScanner.scanViaExplorerGrid)return ExplorerScanner.scanViaExplorerGrid({allowAutoCopy:true}).then(function(r){return mark(r,'explorer-grid');});
          return Promise.reject(new Error('Grade Explorer indisponível.'));
        }
        return importBest().then(function(r){
          if(good(r))return r;
          return grid().then(function(g){
            if(good(g))return g;
            throw failMsg(resultCount(g)||resultCount(r),e);
          });
        }).catch(function(){
          return grid().then(function(g){
            if(good(g))return g;
            throw failMsg(resultCount(g),e);
          });
        });
      };
      ExplorerScanner.__BOM20260608R_SCAN_PATCHED__=true;
    }
    w.__BOM_BUILD_ID__='bom20260608r';
    w.__BOM_HOTFIX_MODE__='ebom-explorer-import-source-of-truth';
  }catch(e){w.__BOM_HOTFIX_ERROR__=e&&e.message?e.message:String(e);}
})(typeof window!=='undefined'?window:this);
