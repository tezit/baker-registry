'use strict';

(function() {
    var app = angular.module("bakersapp");
    app.controller('HomeController', function($rootScope, $scope, $state, $window, $http, serverConfig) {
        

        function bufferToHex (buffer) {
            return Array
                .from (new Uint8Array (buffer))
                .map (b => b.toString (16).padStart (2, "0"))
                .join ("");
        }
        var encoder = new TextEncoder();

        // function hexToArray (hex) {
        //     return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        // }
        // var decoder = new TextDecoder();

        const errorBeginMessage = "There was a problem accessing the node provider. Refresh page to try again, if problem persists wait a few minutes and try again or use settings to change to a different provider. ";
        var bakerWithNoReporterText = "secondary key not specified";

        // $scope.nodeProvider = "https://api.babylonnet.tzstats.com";
        // $scope.contractAccount = "KT1NVzGBXKiD4QoxomkBf3Dphu5RPWtkL9eR"; //new schema big map babylonnet

        $scope.nodeProvider = "https://api.staging.tzstats.com";
        $scope.contractAccount = "KT1ChNsEFxwyCbJyWGSL3KdjeXE28AY1Kaog"; //new schema big map mainnet
        $scope.keys = '';
        $scope.account = '';
        $scope.bakers = [];
        
        $scope.settingsVisible = false;
        $scope.editingBaker = false;
        $scope.newBaker = false;
        $scope.editingReporter = false;

        $scope.editBaker = function(keyHash) {
            $scope.showSearchResults = false;
            $scope.editingBaker = true;
            $scope.newBaker = false;
            $scope.title = "Edit Baker Registry Data";// + " - " + keyHash;

            $scope.bakerToEdit = {};
            for (var i=1; i<= $scope.bakers.length; i++) {
                if (keyHash == $scope.bakers[i-1].bakerAccount) {
                    var foundBaker = $scope.bakers[i-1];
                    $scope.bakerToEdit = foundBaker;
                }
            }  
        }

        $scope.editReporter = function() {
            $scope.editingReporter = true;
            $scope.commandText = "";
            $scope.parameterText = "";
        }

        $scope.cancelEditBaker = function() {
            $scope.editingBaker = false;
            $scope.editingReporter = false;
            $scope.newBaker = false;
            $scope.bakerToEdit = {};

            $scope.commandText = "";
            $scope.parameterText = "";
        }

        $scope.addBaker = function() {
            $scope.showSearchResults = false;
            $scope.cancelEditBaker();
            
            $scope.editingBaker = true;
            $scope.title = "Add New Baker to Registry";
            $scope.newBaker = true;
            
            $scope.bakerToEdit = {};
            $scope.bakerToEdit.reporterAccountFromStorageWasEmpty = true;
            $scope.bakerToEdit.paymentModel = {};
            $scope.bakerToEdit.reporterAccount = bakerWithNoReporterText;
            $scope.bakerToEdit.bakerAccount = "";
            $scope.bakerToEdit.bakerName = "";
            $scope.bakerToEdit.openForDelegation = true;
            $scope.bakerToEdit.bakerOffchainRegistryUrl = "";
            $scope.bakerToEdit.signupRequired = false;
            $scope.bakerToEdit.paymentModel.split = 0.90;
            $scope.bakerToEdit.paymentModel.payoutDelay = 6;
            $scope.bakerToEdit.paymentModel.bakerPaysFromAccounts = [];//[{address: "enter payout address"}]; //need to use object with property rather than just string for databinding in the view with ng-repeat on array
            $scope.bakerToEdit.paymentModel.payoutFrequency = 1;
            $scope.bakerToEdit.paymentModel.minPayout = 0;
            $scope.bakerToEdit.paymentModel.minDelegation = 0;
            $scope.bakerToEdit.paymentModel.subtractPayoutsLessThanMin = true;
            $scope.bakerToEdit.paymentModel.overDelegationThreshold = 100;
            $scope.bakerToEdit.paymentModel.subtractRewardsFromUninvitedDelegation = true;
            $scope.bakerToEdit.paymentModel.bakerChargesTransactionFee = true;
            $scope.bakerToEdit.paymentModel.paymentConfigMask = 16383;
            $scope.bakerToEdit.paymentModel.paymentConfig = genPaymentConfigStruct($scope.bakerToEdit.paymentModel.paymentConfigMask);

        }

        $scope.deletePayoutAccount = function (payoutAccount) {
            $scope.bakerToEdit.paymentModel.bakerPaysFromAccounts.splice($scope.bakerToEdit.paymentModel.bakerPaysFromAccounts.indexOf(payoutAccount), 1);
        }

        $scope.addPayoutAccount = function () {
            $scope.bakerToEdit.paymentModel.bakerPaysFromAccounts.push({address: "new account address " + ($scope.bakerToEdit.paymentModel.bakerPaysFromAccounts.length + 1)});
        }

        function bakerSenderAddress() {
            if ($scope.bakerToEdit.reporterAccountFromStorageWasEmpty == true) {
                return $scope.bakerToEdit.bakerAccount;
            } else {
                return $scope.bakerToEdit.reporterAccountFromStorage;
            }         
        }

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

        function genPaymentConfigMask(boolStruct) {
            var maskNumber = 0;
            if (boolStruct.payForOwnBlocks === true) {
                maskNumber = maskNumber | 1;
            }
            if (boolStruct.payForEndorsements === true) {
                maskNumber = maskNumber | 2;
            }
            if (boolStruct.payGainedFees === true) {
                maskNumber = maskNumber | 4;
            }
            if (boolStruct.payForAccusationGains === true) {
                maskNumber = maskNumber | 8;
            }
            if (boolStruct.subtractLostDepositsWhenAccused === true) {
                maskNumber = maskNumber | 16;
            }
            if (boolStruct.subtractLostRewardsWhenAccused === true) {
                maskNumber = maskNumber | 32;
            }
            if (boolStruct.subtractLostFeesWhenAccused === true) {
                maskNumber = maskNumber | 64;
            }
            if (boolStruct.payForRevelation === true) {
                maskNumber = maskNumber | 128;
            }
            if (boolStruct.subtractLostRewardsWhenMissRevelation === true) {
                maskNumber = maskNumber | 256;
            }
            if (boolStruct.subtractLostFeesWhenMissRevelation === true) {
                maskNumber = maskNumber | 512;
            }
            if (!boolStruct.compensateMissedBlocks === true) {
                maskNumber = maskNumber | 1024;
            }
            if (boolStruct.payForStolenBlocks === true) {
                maskNumber = maskNumber | 2048;
            }
            if (!boolStruct.compensateMissedEndorsements === true) {
                maskNumber = maskNumber | 4096;
            }
            if (!boolStruct.compensateLowPriorityEndorsementLoss === true) {
                maskNumber = maskNumber | 8192;
            }
            return maskNumber;
        }

        $scope.generateBakerUpdateData = function() {
            var clientCommandText = "";
            var clientParameterText = "";
            clientCommandText = "./tezos-client transfer " + ($scope.newBaker ? $scope.signUpBakerDues : $scope.updateDataDues) / 1000000 + " from " + bakerSenderAddress() + " to ";
            clientCommandText += $scope.contractAccount + " ";

            var b = $scope.bakerToEdit;
            b.paymentModel.paymentConfigMask = genPaymentConfigMask(b.paymentModel.paymentConfig);
            // console.log('Payment config mask: ' + b.paymentModel.paymentConfigMask + ' - ' + b.paymentModel.paymentConfigMask.toString(2));

            var hexBakerName = bufferToHex(encoder.encode(b.bakerName));
            var hexBakerOffchainRegistryUrl = bufferToHex(encoder.encode(b.bakerOffchainRegistryUrl));

            var payoutAccountsString = '';
            b.paymentModel.bakerPaysFromAccounts.forEach(function(payoutAccount) {
                payoutAccountsString += '"' + payoutAccount.address + '"; '
            });

            var reporterAccountString = '';
            if (b.reporterAccount == bakerWithNoReporterText || b.reporterAccount.trim() == '') {
                reporterAccountString = 'None';
            } else {
                reporterAccountString = '(Some "' + b.reporterAccount + '")';
            }
            clientParameterText += '--arg \'Left (Pair "' + b.bakerAccount;
            clientParameterText += '" (Pair (Some (Pair (Pair (Pair 0x'+ hexBakerName + ' ' + (b.openForDelegation == true ? "True" : "False") 
            clientParameterText += ') 0x' + hexBakerOffchainRegistryUrl + ') (Pair (Pair ' + Math.trunc((b.paymentModel.split * 10000)) + ' {' + payoutAccountsString + '}) '; 
            clientParameterText += '(Pair (Pair (Pair ' + Math.trunc((b.paymentModel.minDelegation * 10000)) + ' ' + (b.paymentModel.subtractPayoutsLessThanMin == true ? "True" : "False");
            clientParameterText += ') (Pair ' + b.paymentModel.payoutDelay; 
            clientParameterText += ' (Pair ' + b.paymentModel.payoutFrequency + ' ' + Math.trunc((b.paymentModel.minPayout * 10000)) + '))) ';
            clientParameterText += '(Pair (Pair ' + (b.paymentModel.bakerChargesTransactionFee == true ? "True" : "False") + ' ' + b.paymentModel.paymentConfigMask + ') ';
            clientParameterText += '(Pair ' + b.paymentModel.overDelegationThreshold + ' ' + (b.paymentModel.subtractRewardsFromUninvitedDelegation == true ? "True" : "False");
            clientParameterText += ')))))) ' + reporterAccountString + '))\' ';

            clientCommandText += clientParameterText;
            clientCommandText += "--burn-cap 1 --dry-run"

            $scope.commandText = clientCommandText;
            $scope.parameterText = clientParameterText;
        }

        $scope.generateBakerUpdateReporterData = function() { //deprecated
            var clientCommandText = "";
            var clientParameterText = "";
            clientCommandText = "tezos-client transfer 0 from " + bakerSenderAddress() + " to ";
            clientCommandText += $scope.contractAccount + " ";

            clientParameterText += '--arg \'Pair "' + $scope.bakerToEdit.keyHash + '" (Right "' + $scope.bakerToEdit.reporter + '")\' '; 
            clientCommandText += clientParameterText;
            clientCommandText += "--burn-cap 1 --dry-run"

            $scope.commandText = clientCommandText;
            $scope.parameterText = clientParameterText;
        }

        // $scope.getAllBakers = function() {
        //     $rootScope.loading = true;
        //     $scope.cancelEditBaker();
        //     getAllRegistryBakers($scope.nodeProvider, $scope.contractBigMap).then(function(r) {
        //         console.log(r);
        //         var convertedBakers = [];
        //         r.forEach(function(baker) {
        //             var convertedBaker = convertBakerPayoutAccountsToObjectsForViewRepeaterCompatibility(baker); 
        //             convertedBakers.push(convertedBaker);
        //         });
        //         $scope.$apply(function () {
        //             $scope.bakers = convertedBakers;
        //         });
        //     }).catch(function(e){
        //         console.log(e);
        //         $rootScope.loadingError = true;
        //         $rootScope.loadingErrorMessage = errorBeginMessage + e;
        //     }).finally(function() {
        //         $scope.$apply(function () {
        //             $rootScope.loading = false;
        //         });
        //     });   
        // }

        $scope.showSearchResults = false;
        $scope.findBaker = function() {
            $rootScope.loading = true;
            $scope.cancelEditBaker();
            $scope.searchResultsTitle = "Searching..."

            getRegistryBaker($scope.bakerAccount, $scope.nodeProvider, $scope.contractBigMap).then(function(r) {
                console.log(r);
                $scope.$apply(function () {
                    $scope.showSearchResults = true;
                    $scope.searchResultsTitle = "Search Results for " + $scope.bakerAccount;
                    if (r.bakerName == undefined) { 
                        $scope.bakers = []; //TODO: used mostly for testing of getAll, no longer really need an array of bakers, either found 1 or none
                    } else {
                        var baker = convertBakerPayoutAccountsToObjectsForViewRepeaterCompatibility(r);
                        $scope.bakers = [r];
                    }
                });
            }).catch(function(e){
                console.log(e);
                $rootScope.loadingError = true;
                $rootScope.loadingErrorMessage = errorBeginMessage + e;
            }).finally(function() {
                $scope.$apply(function () {
                    $rootScope.loading = false;
                });
            });         
        }

        $scope.getRegistryConfig = function() {
            $rootScope.loading = true;

            getRegistryContractConfig($scope.nodeProvider, $scope.contractAccount).then(function(r) {
                console.log(r);
                $scope.$apply(function () {
                    $scope.signUpBakerDues = r.signup_fee;
                    $scope.updateDataDues = r.update_fee;
                    $scope.contractBigMap = r.__entry_00_big_map__; //17 bigmapID Tezos uses to store big map, note 18 Nov 2019 version of tzstats changed from "bigmap" to this more elaborate fieldname where non-annotated fields 00 is the index of its place in tree
                    $scope.contractOwner = r.owner;
                });
            }).catch(function(e){
                console.log(e);
                $rootScope.loadingError = true;
                $rootScope.loadingErrorMessage = errorBeginMessage + e;
            }).finally(function() {
                $scope.$apply(function () {
                    $rootScope.loading = false;
                });
            });
                
        }
        $scope.getRegistryConfig();

        function convertBakerPayoutAccountsToObjectsForViewRepeaterCompatibility(baker) {
            var payoutAccountsAsObjects = [];
            baker.paymentModel.bakerPaysFromAccounts.forEach(function(account) {
                payoutAccountsAsObjects.push({"address": account});
            });
            baker.paymentModel.bakerPaysFromAccounts = payoutAccountsAsObjects;
            return baker;
        }

    })
}());