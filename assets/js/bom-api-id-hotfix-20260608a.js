/* BOM strict visual cap hotfix - 20260608p */
(function(w){
  try{
    if(typeof APP_CONFIG!=='undefined'){
      APP_CONFIG.BUILD='bom20260608p';
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
    function shouldCap(actual,limit){return limit>0&&actual>limit;}
    function rawCount(){try{return BomService&&BomService.__BOM_RAW_GET_NODE_COUNT__?BomService.__BOM_RAW_GET_NODE_COUNT__():BomService.getNodeCount();}catch(e){return 0;}}
    function count(){var n=rawCount(),e=expected();return shouldCap(n,e)?e:n;}
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
          var actual=rawCount();
          if(actual>limit){w.__BOM_BOUNDED_OVERSHOOT__={expected:limit,actual:actual,node:n.physicalid};}
          return count()>=limit?Promise.resolve():step();
        });
      }
      return step();
    }
    if(typeof BomService!=='undefined'&&BomService.getNodeCount&&!BomService.__BOM20260608P_COUNT_PATCHED__){
      BomService.__BOM_RAW_GET_NODE_COUNT__=BomService.__BOM_RAW_GET_NODE_COUNT__||BomService.getNodeCount.bind(BomService);
      BomService.getNodeCount=function(){return count();};
      BomService.__BOM20260608P_COUNT_PATCHED__=true;
    }
    if(typeof BomNormalizer!=='undefined'&&BomNormalizer.toFlatList&&!BomNormalizer.__BOM20260608P_FLAT_PATCHED__){
      var rawFlat=BomNormalizer.__BOM_RAW_TO_FLAT_LIST__||BomNormalizer.toFlatList.bind(BomNormalizer);
      BomNormalizer.__BOM_RAW_TO_FLAT_LIST__=rawFlat;
      BomNormalizer.toFlatList=function(idx,rootId){
        var flat=rawFlat(idx,rootId)||[];
        var e=expected();
        if(shouldCap(flat.length,e)){
          w.__BOM_VISUAL_CAP_LAST__={expected:e,actual:flat.length,shown:e};
          return flat.slice(0,e);
        }
        return flat;
      };
      BomNormalizer.__BOM20260608P_FLAT_PATCHED__=true;
    }
    if(typeof BomService!=='undefined'&&BomService.loadInitialScope&&!BomService.__BOM20260608P_SCOPE_PATCHED__){
      var initial=BomService.__BOM_RAW_LOAD_INITIAL_SCOPE__||BomService.loadInitialScope.bind(BomService);
      BomService.__BOM_RAW_LOAD_INITIAL_SCOPE__=initial;
      BomService.loadInitialScope=function(pid,opt){
        opt=opt||{};var exp=opt.expectedCount||expected();
        return initial(pid,opt).then(function(meta){
          if(exp&&count()<exp){
            if(typeof App!=='undefined'&&App.setStatus)App.setStatus('API limitada '+count()+'/'+exp+'…','info');
            return boundedExpand(exp).then(function(){
              meta.itemCount=count();meta.explorerExpectedCount=exp;meta.scopeMode='bounded-api-strict-visual-cap';return meta;
            });
          }
          meta.itemCount=count();return meta;
        });
      };
      BomService.__BOM20260608P_SCOPE_PATCHED__=true;
    }
    w.__BOM_BUILD_ID__='bom20260608p';
    w.__BOM_HOTFIX_MODE__='bounded-api-strict-visual-cap';
  }catch(e){w.__BOM_HOTFIX_ERROR__=e&&e.message?e.message:String(e);}
})(typeof window!=='undefined'?window:this);
