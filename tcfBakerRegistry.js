var encoder = new TextEncoder();
var decoder = new TextDecoder();

let bakerWithNoReporterText = "secondary key not specified";

function genPaymentConfigStruct(paymentConfigMask) {

    return {
        payForOwnBlocks: (paymentConfigMask & 1) > 0,
        payForEndorsements: (paymentConfigMask & 2) > 0,
        payGainedFees: (paymentConfigMask & 4) > 0,
        payForAccusationGains: (paymentConfigMask & 8) > 0,
        subtractLostDepositsWhenAccused: (paymentConfigMask & 16) > 0,
        subtractLostRewardsWhenAccused: (paymentConfigMask & 32) > 0,
        subtractLostFeesWhenAccused: (paymentConfigMask & 64) > 0,
        payForRevelation: (paymentConfigMask & 128) > 0,
        subtractLostRewardsWhenMissRevelation: (paymentConfigMask & 256) > 0,
        subtractLostFeesWhenMissRevelation: (paymentConfigMask & 512) > 0,
        compensateMissedBlocks: !((paymentConfigMask & 1024) > 0),
        payForStolenBlocks: (paymentConfigMask & 2048) > 0,
        compensateMissedEndorsements: !((paymentConfigMask & 4096) > 0),
        compensateLowPriorityEndorsementLoss: !((paymentConfigMask & 8192)) > 0,
    };
}

function bufferToHex (buffer) {
    return Array
        .from (new Uint8Array (buffer))
        .map (b => b.toString (16).padStart (2, "0"))
        .join ("");
}

function hexToArray (hex) {
    return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function getRegistryBaker(bakerAccount, indexerProvider, bigMapId) {
    return new Promise(function (resolve, reject) {
        fetch(indexerProvider + '/explorer/bigmap/' + bigMapId + '/' + bakerAccount + '?prim=false').then(function(res){
            if (!res.ok) {
                if (res.status == 400 || res.status == 404) {
                    resolve({});
                } else {
                    throw new Error("HTTP error, status = " + res.status);
                }
                
            } else {
                res.json().then(function(data) {
                    baker = parseBakerData(data);
                    resolve (baker);
                }).catch(function(e){
                    reject(e);
                });
            }
            
        }).catch(function(e){
            reject(e);
        });
    });
}

//returns the bigmap id, signup fee, update fee values from the registry contract storage
function getRegistryContractConfig(indexerProvider, contractAddress) { 
    return new Promise(function(resolve, reject) {
        fetch(indexerProvider + '/explorer/contract/' + contractAddress +'/storage?prim=false').then(function(res){
            if (!res.ok) {
                throw new Error("HTTP error, status = " + res.status);
            }
            res.json().then(function(data) {
                resolve (data.value);
            }).catch(function(e){
                reject(e);
            });
        }).catch(function(e){
            reject(e);
        });
    });
}

function getAllRegistryBakers(indexerProvider, bigMapId) {
    return new Promise(function(resolve, reject) {
    fetch(indexerProvider + '/explorer/bigmap/' + bigMapId + '/values?limit=100').then(function(res){
        if (!res.ok) {
            throw new Error("HTTP error, status = " + res.status);
        }
        res.json().then(function(data) {
            fetch(indexerProvider + '/explorer/bigmap/' + bigMapId + '/values?limit=100&offset=100').then(function(res){
                if (!res.ok) {
                    throw new Error("HTTP error, status = " + res.status);
                }
                res.json().then(function(offsetdata) {
                    // reportersMap = new Map();

                    bakersList = [];
                    var count = -1;

                    var combinedData = data.concat(offsetdata);
                    combinedData.forEach(function(bakerData) {
                        count += 1;
                        var baker = parseBakerData(bakerData);
                        bakersList.push(baker);
                    });
                    resolve(bakersList);

            }).catch(function(e){
                reject(e);
            });
        }).catch(function(e){
            reject(e);
        });
            
        }).catch(function(e){
            reject(e);
        });
    }).catch(function(e){
        reject(e);
    });

    });
    
}

function parseBakerData(bakerData) {
    var baker = {
        "bakerName": bakerData.value.data.bakerName,
        "openForDelegation": bakerData.value.data.openForDelegation,
        "bakerAccount": bakerData.key.key,
        "reporterAccount": bakerData.value.reporterAccount,
        "bakerOffchainRegistryUrl": bakerData.value.data.bakerOffchainRegistryUrl,
        "bakerRegistryLastUpdated": bakerData.value.last_update
    }

    baker.paymentModel = {
        "split": bakerData.value.data.split / 10000,
        "bakerPaysFromAccounts": bakerData.value.data.bakerPaysFromAccounts, 
        "minDelegation": bakerData.value.data.minDelegation / 10000,
        "subtractPayoutsLessThanMin": bakerData.value.data.subtractPayoutsLessThanMin,
        "payoutDelay": bakerData.value.data.payoutDelay * 1, //convert the json string to an int
        "payoutFrequency": bakerData.value.data.payoutFrequency * 1, //convert the json string to an int
        "minPayout": bakerData.value.data.minPayout / 10000,
        "bakerChargesTransactionFee": bakerData.value.data.bakerChargesTransactionFee,
        "paymentConfigMask": bakerData.value.data.paymentConfigMask,
        "overDelegationThreshold": bakerData.value.data.overDelegationThreshold,
        "subtractRewardsFromUninvitedDelegation": bakerData.value.data.subtractRewardsFromUninvitedDelegation
    }
    baker.bakerName = decoder.decode(hexToArray(baker.bakerName));
    if (baker.bakerOffchainRegistryUrl != '') {
        baker.bakerOffchainRegistryUrl = decoder.decode(hexToArray(baker.bakerOffchainRegistryUrl));
    }
    
    
    if (baker.reporterAccount == null) {
        baker.reporterAccount = bakerWithNoReporterText;
        baker.reporterAccountFromStorageWasEmpty = true; //todo: only needed because combining the contract calls to "updateData" and "updateReporter", in which case when modify the reporter model need to differentiate if its the first time reporter added
    } else {
        baker.reporterAccountFromStorageWasEmpty = false;
        baker.reporterAccountFromStorage = baker.reporterAccount;
    }

    baker.paymentModel.paymentConfig = genPaymentConfigStruct(baker.paymentModel.paymentConfigMask); // baking bad compatible struct;
    return baker;
}
