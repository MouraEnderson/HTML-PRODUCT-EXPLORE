/* BOM bounded expansion hotfix - 20260608n */
(function(w){
  try{
    if(typeof APP_CONFIG!=='undefined'){
      APP_CONFIG.BUILD='bom20260608n';
      APP_CONFIG.CAN_USE_ENOVIA_API=true;
      APP_CONFIG.PILOT_GRID_FIRST=true;
      APP_CONFIG.MANUAL_API_FALLBACK=true;
      APP_CONFIG.API_ENG_BOM_FIRST=true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK=false;
      APP_CONFIG.BOM_INITIAL_DEPTH=1;
      APP_CONFIG.PILOT_API_TREE_DEPTH=1;
      APP_CONFIG.PRESERVE_OCCURRENCE_ROWS=true;
    }
    function expected(){
      try{if(typeof ProductExplorerBridge!=='undefined'&&ProductExplorerBridge.getExplorerObjectCount)return ProductExplorerBridge.getExplorerObjectCount()||0;}catch(e){}
      try{if(typeof ExplorerContext!=='undefined'&&ExplorerContext.refresh){var c=ExplorerContext.refresh(true);return c&&c.expectedCount||0;}}catch(e2){}
      return 0;
    }
    function count(){try{return BomService&&BomService.getNodeCount?BomService.getNodeCount():0;}catch(e){return 0;}}
    function index(){try{return BomService&&BomService.getIndex?BomService.getIndex():{};}catch(e){return {};}}
    function sortedExpandable(){
      var idx=index(),arr=[];
      Object.keys(idx).forEach(function(k){var n=idx[k];if(n&&!n.loaded&&n.isAssembly!==false)arr.push(n);});
      arr.sort(function(a,b){return (a.level||0)-(b.level||0);});
      return arr;
    }
    function boundedExpand(limit){
      limit=limit||expected();
      if(!limit||!BomService||!BomService.expandNode)return Promise.resolve();
      function step(){
        if(count()>=limit)return Promise.resolve();
        var q=sortedExpandable();
        if(!q.length)return Promise.resolve();
        var n=q[0];
        return BomService.expandNode(n.physicalid).catch(function(){}).then(function(){
          if(count()>limit){w.__BOM_BOUNDED_OVERSHOOT__={expected:limit,actual:count(),node:n.physicalid};}
          return count()>=limit?Promise.resolve():step();
        });
      }
      return step();
    }
    if(typeof BomService!=='undefined'&&BomService.loadInitialScope&&!BomService.__BOM20260608N_PATCHED__){
      var initial=BomService.loadInitialScope.bind(BomService);
      BomService.loadInitialScope=function(pid,opt){
        opt=opt||{};var exp=opt.expectedCount||expected();
        return initial(pid,opt).then(function(meta){
          if(exp&&count()<exp){
            if(typeof App!=='undefined'&&App.setStatus)App.setStatus('API limitada '+count()+'/'+exp+'…','info');
            return boundedExpand(exp).then(function(){
              meta.itemCount=count();meta.explorerExpectedCount=exp;meta.scopeMode='bounded-api';return meta;
            });
          }
          meta.itemCount=count();return meta;
        });
      };
      BomService.__BOM20260608N_PATCHED__=true;
    }
    w.__BOM_BUILD_ID__='bom20260608n';
    w.__BOM_HOTFIX_MODE__='bounded-api-expansion';
  }catch(e){w.__BOM_HOTFIX_ERROR__=e&&e.message?e.message:String(e);}
})(typeof window!=='undefined'?window:this);
