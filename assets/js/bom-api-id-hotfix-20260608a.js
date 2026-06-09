/* BOM EBOM source-of-truth hotfix - 20260608q */
(function(w){
  try{
    if(typeof APP_CONFIG!=='undefined'){
      APP_CONFIG.BUILD='bom20260608q';
      APP_CONFIG.PRIMARY_LOADER='tsv';
      APP_CONFIG.PILOT_GRID_FIRST=true;
      APP_CONFIG.FAST_TSV_MAX=1000000;
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH=false;
      APP_CONFIG.USE_API_SCAN_FIRST=false;
      APP_CONFIG.AUTO_SYNC_PREFER_API=false;
      APP_CONFIG.API_ENG_BOM_FIRST=true;
      APP_CONFIG.CAN_USE_ENOVIA_API=true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK=false;
      APP_CONFIG.MANUAL_API_FALLBACK=false;
      APP_CONFIG.ALLOW_PASTE_FALLBACK=true;
      APP_CONFIG.SKIP_CLIPBOARD_READ=false;
      APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED=true;
      APP_CONFIG.USE_DOM_MIRROR_PRIMARY=true;
      APP_CONFIG.DOM_MIRROR_FALLBACK=true;
      APP_CONFIG.PRESERVE_OCCURRENCE_ROWS=true;
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
    function mark(res,src){if(res){res.loaderMode=src;res.mode=res.mode||src;}return res;}
    function exact(res){var e=expected(),n=resultCount(res);return !e||(n===e);}
    function strictExplorerError(n,e){
      return new Error('E-BOM parcial '+n+'/'+e+'. A E-BOM deve ser fiel ao Product Explorer. Expanda/carregue a grade no Explorer, clique na tabela, use Ctrl+A > Ctrl+C e Atualizar estrutura.');
    }
    if(typeof ExplorerContext!=='undefined'){
      ExplorerContext.suggestLoaderMode=function(){return 'tsv';};
    }
    if(typeof ExplorerScanner!=='undefined'&&!ExplorerScanner.__BOM20260608Q_SCAN_PATCHED__){
      var originalScan=ExplorerScanner.scan&&ExplorerScanner.scan.bind(ExplorerScanner);
      ExplorerScanner.scan=function(){
        var e=expected();
        function tryGrid(){
          if(ExplorerScanner.scanViaExplorerGrid){
            return ExplorerScanner.scanViaExplorerGrid({allowAutoCopy:true,preferApi:false,source:'manual'}).then(function(r){return mark(r,'explorer-grid');});
          }
          return Promise.reject(new Error('Explorer grid indisponivel.'));
        }
        function tryPaste(){
          if(ExplorerScanner.scanViaClipboardOrPaste){
            return ExplorerScanner.scanViaClipboardOrPaste().then(function(r){return mark(r,'paste');});
          }
          return Promise.reject(new Error('Paste indisponivel.'));
        }
        return tryGrid().then(function(r){
          if(exact(r))return r;
          return tryPaste().then(function(p){
            if(exact(p))return p;
            var n=resultCount(p)||resultCount(r);
            throw strictExplorerError(n,e);
          });
        }).catch(function(){
          return tryPaste().then(function(p){
            if(exact(p))return p;
            var n=resultCount(p);
            if(e>0)throw strictExplorerError(n,e);
            if(originalScan)return originalScan();
            return p;
          });
        });
      };
      ExplorerScanner.__BOM20260608Q_SCAN_PATCHED__=true;
    }
    w.__BOM_BUILD_ID__='bom20260608q';
    w.__BOM_HOTFIX_MODE__='ebom-explorer-tsv-source-of-truth';
  }catch(e){w.__BOM_HOTFIX_ERROR__=e&&e.message?e.message:String(e);}
})(typeof window!=='undefined'?window:this);
