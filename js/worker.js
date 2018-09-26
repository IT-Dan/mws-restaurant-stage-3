importScripts('idb.js');

onmessage = (e) => {

    let objects = e.data.objects;
    let api = e.data.api

    console.log(`Worker IDB: Checking for changes in ${api}`);

    let dbPromise = idb.open(api, 1, (upgradeDB) => {
        let restaurantStore = upgradeDB.createObjectStore(api, {keyPath: 'id'}); // Value: Key
    });

    dbPromise.then( (db) => {
        let tx = db.transaction(api, 'readwrite');
        let store = tx.objectStore(api);
        
        // TODO: Use web worker to do this.                
        objects.forEach( object => {
            store.get(object.id).then( idbObject => {
                if(JSON.stringify(object) !== JSON.stringify(idbObject)) {
                    store.put(object)
                        .then( (object) => console.log(`Worker IDB: ${api} updatimportScripts('idb.js');onmessage=(e)=>{let objects=e.data.objects;let api=e.data.api
console.log(`Worker IDB: Checking for changes in ${api}`);let dbPromise=idb.open(api,1,(upgradeDB)=>{let restaurantStore=upgradeDB.createObjectStore(api,{keyPath:'id'})});dbPromise.then((db)=>{let tx=db.transaction(api,'readwrite');let store=tx.objectStore(api);objects.forEach(object=>{store.get(object.id).then(idbObject=>{if(JSON.stringify(object)!==JSON.stringify(idbObject)){store.put(object).then((object)=>console.log(`Worker IDB: ${api} updated`))}})})});postMessage(`Worker IDB: ${api} checked`)}ed`));
                }
            });
        });
    });
    postMessage(`Worker IDB: ${api} checked`);
}
