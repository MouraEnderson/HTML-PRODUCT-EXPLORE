/* BOM browser-auth bridge hotfix - 20260610b */
(function(w){
  try{
    if(typeof APP_CONFIG!=='undefined'){
      APP_CONFIG.BUILD='bom20260610b';
      APP_CONFIG.BOM_BACKEND_URL='https://bom-resolver.onrender.com';
      APP_CONFIG.CAN_USE_ENOVIA_API=true;
      APP_CONFIG.PILOT_GRID_FIRST=true;
      APP_CONFIG.USE_API_SCAN_FIRST=false;
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH=false;
      APP_CONFIG.AUTO_SYNC_PREFER_API=false;
      APP_CONFIG.M