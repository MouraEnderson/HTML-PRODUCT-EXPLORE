/* BOM minimal hotfix - 20260608m */
(function(w){
  try{
    if(typeof APP_CONFIG!=='undefined'){
      APP_CONFIG.BUILD='bom20260608m';
      APP_CONFIG.CAN_USE_ENOVIA_API=true;
      APP_CONFIG.PILOT_GRID_FIRST=true;
      APP_CONFIG.MANUAL_API_FALLBACK=true;
      APP_CONFIG.API_ENG_BOM_FIRST=true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK=false;
      APP_CONFIG.PILOT_API_TREE_DEPTH=4;
      APP_CONFIG.BOM_INITIAL_DEPTH=4;
      APP_CONFIG.BOM_FAST_DEPTH=4;
      APP_CONFIG.PRESERVE_OCCURRENCE_ROWS=true;
    }
    if(typeof BomService!=='undefined'&&BomService.loadLazyFull){
      BomService.loadInitialScope=BomService.loadLazyFull;
    }
    w.__BOM_BUILD_ID__='bom20260608m';
    w.__BOM_HOTFIX_MODE__='minimal-full-lazy-loader';
  }catch(e){w.__BOM_HOTFIX_ERROR__=e&&e.message?e.message:String(e);}
})(typeof window!=='undefined'?window:this);
