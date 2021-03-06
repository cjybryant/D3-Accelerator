import { Tracker } from 'meteor/tracker';
import { Session } from 'meteor/session';


var landSize = 3;
var blockSize = 150;
var landSrc = "/img/game/land.svg";

var prefix = "/img/game/plant/";
var postfix = ".svg";

var currentCropId;
var plantMode = false;
var currentLandId;
var placeMode = false;
var currentCropLand;
var audio;

var visitNode;
var s_Id;

var gameMode = "Farmer";


const _dep = new Tracker.Dependency;
const _crop = new Tracker.Dependency;
const _character = new Tracker.Dependency;


var cursorX;
var cursorY;

var panelCounter = 4, panelCount = 3;

var cropList = [];
var stockList = [];
var landList = [];

var staminaList = {crop:5,steal:5, stealFail:20};

var currentUser = {};

var userLandConfiguration = [];

var showThief = false;

var cropTypeList = [];

var landTypeList = [];

var userCropType = [];


var property_log = [];
var user_property = [];
var property_database = [];
var display_field = [];

var currentClickedCrop = null;
var currentClickedLand = null;
var removeMode = false;

var floatOffset = 1000;

///////////////////////////
//  prototype functions  //
///////////////////////////

Date.prototype.addTime = function(days, hours, minutes, seconds) {
    //var dat = new Date(this.valueOf());
    var dat = new Date();

    dat.setDate(dat.getDate() + days);
    dat.setHours(dat.getHours() + hours);
    dat.setMinutes(dat.getMinutes() + minutes);
    dat.setSeconds(dat.getSeconds() + seconds);

    return dat;
}

/////////////////
//  onCreated  //
/////////////////

Template.gameIndex.created = function() {
    s_Id = CongressInstance.stakeholderId(web3.eth.accounts[currentAccount]);
    console.log(s_Id);
    s_Id = s_Id.c[0];
    if (s_Id == 0){
        alert("Please Register First");
        Router.go('/');
        return;
    }


    loading(1);


    getUserData(s_Id);
    getLandConfiguration(s_Id);
    loadCropList(s_Id);
    getUserStockList(s_Id);

    fetchGameInitConfig(s_Id);
    console.log(cropTypeList);

    eventListener();
    // Tracker.autorun(() => {
    //   Meteor.subscribe('characterList', { userName: Session.get('userName') });
    // });



    // Template.registerHelper('characterList',function(input){
    //     return Session.get("userName");
    // });


    audio = new Audio('/music/background_music.mp3');
    //audio.play();

    $(window).resize(function(evt) {
        initCropLand(s_Id);
    });


}

//////////////////
//  onRendered  //
//////////////////

Template.gameIndex.rendered = function() {
    if(!this._rendered) {

        updateUserExp(0);
        updateSyndicateExp(0);
        updateStaminaBar(0);

        initCropLand(s_Id);

        showConfirmation(s_Id);
        Session.set('userName', currentUser.name);
        Session.set('userExp', currentUser.exp);
        Session.set('userSta', currentUser.sta);
        Session.set('userCharacter', currentUser.type);
        Session.set('userLevel', currentUser.level);
        Session.set('SyndicateLevel', currentUser.SyndicateLevel);
        //farmObjectLoader();

        setInterval(checkMission, 1000);
        setInterval(cropSummaryUpdate, 1000);
        //setInterval(updateUserStamina, 1000*60);
        setInterval(updateUserStamina, 500);

        //initCropLand(otherUser, otherUserLandConfiguration);
        console.log('gameArea render complete');

        loading(0);
        //console.log(fetchAllCropTypes());
            //levelUp();
    }
}

Template.shop.rendered = function () {

}

//////////////////
//    onLeave   //
//////////////////

$(window).on("beforeunload", function() {
    CongressInstance.updateStakeholderLastLogin(s_Id, new Date(), {from:web3.eth.accounts[currentAccount], gas:2000000} );
    CongressInstance.updateUserStamina(s_Id, currentUser.sta, {from:web3.eth.accounts[currentAccount], gas:2000000} );

    console.log("saved");
    return true ? "Do you really want to close?" : null;
})

///////////////
//  Helpers  //
///////////////

Template.shop.helpers({

});

Template.gamingArea.helpers({
    currentLevel: function(){
      _character.depend();
        //return currentUser.level;
      return Session.get('Levelup');
    }
});

Template.characterList.helpers({
    userName: function() {
      return Session.get('userName');
    },
    characterType: function() {
      return Session.get('userCharacter');
    }
});

Template.statusList.helpers({
    crops: function(){

        var cropsData = [];
        console.log(cropTypeList);
        for (var i = 0 ; i < cropTypeList.length; i++){
            var data = cropTypeList[i];

            //console.log(data);
            cropsData.push({
                "name": "crop property"+ i,
                "img": prefix+data.img[3]+postfix,
                "content": data.name
            });
        }
        _crop.depend();
        return cropsData;
    },
    cropsSummary: function(){
        var cropsData = [];

        for (var i = 0 ; i < cropList.length; i++){
            if (cropList[i].name == 0){
                continue;
            }
            var data = cropList[i];

            //console.log(data);
            cropsData.push({
                "id": "currentCrop"+data.id,
                "name": data.name,
                "img": prefix+data.img+postfix,
                "timeLeft": null
            });
        }

        _dep.depend();
        return cropsData;



    },
    lands: function(){

        var landsData = [];

        for (var i = 0 ; i < landTypeList.length; i++){
            var data = landTypeList[i];

            //console.log(data);
            landsData.push({
                "name": "cropLand farmLand"+data.id,
                "img": prefix+data.img+postfix,
                "content": data.name
            });
        }
        return landsData;
    },
});


//////////////
//  Events  //
//////////////

Template.shop.events({
    'click #btn_show_property': function () {
        set_propertyType_table();
    },
    'click #btn_shop_close': function () {
        $('.property_shop').css('display', 'none');
    },

    'click #btn_property_tradeable':function(){
        set_property_table();
    },
});


Template.gameIndex.events({
    'click .cropObject': function (event){
        // var left = $(event.target).position().left;
        // var top = $(event.target).position().top;
        if (currentCropId != null && plantMode){
            var _landId = currentCropLand.split("cropLand")[1];


            if (userLandConfiguration[_landId].crop != -1){
                alert("Don't plant twice !");
                return;
            }else if (userLandConfiguration[_landId].land == -1){
                alert("You need a land first !");
                return;
            }else if (currentUser.sta < staminaList["crop"]){
                alert("not enough stamina");
                return;
            }

            updateStaminaBar(staminaList["crop"]);

            var styles = {
                'z-index' : "2",
                'opacity': 1
            };
            $( ".cropObject" ).clone().attr("class","croppedObject croppedObject"+cropList.length).attr("cropcount", cropTypeList[currentCropId].count).appendTo(".surfaceObject").css(styles);

            //var start = Date.now();
            var start = new Date();
            var end = new Date();

            var cropWaitingTime = cropTypeList[currentCropId].time.split(".");

            end = end.addTime(parseInt(cropWaitingTime[0]), parseInt(cropWaitingTime[1]), parseInt(cropWaitingTime[2]), parseInt(cropWaitingTime[3]));

            var _id = cropList.length;


            //userLandConfiguration[_landId].crop = cropTypeList[currentCropId].id;
            userLandConfiguration[_landId].crop = _id;
            usingPropertyInstance.updateUserLandConfiguration(s_Id, _landId, _id, 0, 'crop', {from:web3.eth.accounts[currentAccount], gas:2000000});

            usingPropertyInstance.addCropList(s_Id, cropTypeList[currentCropId].name, cropTypeList[currentCropId].img[3], start, end, parseInt(cropTypeList[currentCropId].id), 0, parseInt(cropTypeList[currentCropId].count), {from:web3.eth.accounts[currentAccount], gas:2000000});
            cropList.push({
                id: _id,
                name: cropTypeList[currentCropId].name,
                img:cropTypeList[currentCropId].img[3],
                start: start,
                end: end,
                type: cropTypeList[currentCropId].id,
                ripe: 0,
                count: cropTypeList[currentCropId].count
            });
            //console.log(cropList);
            _dep.changed();

            userCropType[currentCropId].count++;
            usingPropertyInstance.updateUserPropertyType(s_Id, currentCropId, {from:web3.eth.accounts[currentAccount], gas:2000000});
            console.log(userLandConfiguration);
            console.log(cropList);

        }else{
            alert("Specify Crop first");
            return;
        }



    },
    'click .farmObject': function(event){
        if (currentLandId != null && placeMode){
            var _landId = currentCropLand.split("cropLand")[1];

            if (userLandConfiguration[_landId].land != -1){
                alert("Don't plant twice !");
                return;
            }
            landTypeList[currentLandId].count++;
            currentCropLand = currentCropLand.split(" ")[1];
            $( ".farmObject" ).children().clone().appendTo("."+currentCropLand).css({opacity:1});
            $("."+currentCropLand).css({"border-style":"none"});
            var _id = landList.length;
            userLandConfiguration[_landId].land = landTypeList[currentLandId].id;
            usingPropertyInstance.updateUserLandConfiguration(s_Id, _landId, -1, landTypeList[currentLandId].id, 'land', {from:web3.eth.accounts[currentAccount], gas:2000000});

            landList.push({
                id: _id,
                name: landTypeList[currentLandId].name,
                img:landTypeList[currentLandId].img,
            });

            console.log(userLandConfiguration);
            console.log(cropList);
        }else{
            alert("Specify Land first");
            return;
        }
    },
    'click .thief': function(event){
        $(event.target).parent().css({opacity:0, transform:"translateY(50px)"});
        setTimeout(function(){
            $(event.target).parent().remove();
        },1000);


    },
    'click .croppedObject': function (event){
        // var left = $(event.target).position().left;
        // var top = $(event.target).position().top;

            var id, cropClass, cropCount;

            if (event.target.className == ""){
                cropClass = $(event.target).parent().prop('className').split(" ")[1];
                id = cropClass.split("croppedObject")[1];
            }else{
                cropClass = event.target.className.split(" ")[1];
                id = cropClass.split("croppedObject")[1];

            }

            cropCount = $(event.target).parent().attr("cropcount");

            var typeIndex;
            for (var j = 0 ; j < cropTypeList.length ; j++){
                if (cropTypeList[j].id == cropList[id].type){
                    typeIndex = j;
                }
            }
            if(gameMode == "Farmer"){
                if (cropList[id].ripe){

                    $(".animationImg").html("<img src = '" + prefix+ cropTypeList[typeIndex].img[3] + postfix +"' />");
                    //var exp = cropTypeList[cropList[id].type].exp;

                    var difference = elapsedTime(cropList[id].start, cropList[id].end);
                    var exp = (difference/(1000*30))*20;
                    updateUserExp(exp);
                    $(".scoreObject").html("+" + exp +"XP");
                }else{
                    alert("Patience is a virtue <3");
                    return;
                }

                var landTop = $(".land").position().top;
                var landLeft = $(".land").position().left;

                var areaLeft = $(".gamingArea").position().left;

                var divHeight =$(".farmObject").height()/5;
                var divWidth = $(".farmObject").width()/4;

                var temp = $(".animationObject").clone().attr("class", "animationTemp").appendTo(".canvas");
                temp.css({display:"inline", top: cursorY-divHeight, left: cursorX-areaLeft+divWidth});
                temp.addClass("animationTempShow");

                setTimeout(function(){
                    temp.css({opacity:0, transform:"translateY(0px)"});
                    setTimeout(function(){
                        temp.css({display: "none"});
                        temp.remove();
                    },1000);
                },1000);

                var stockId = stockList.length;
                stockList.push({
                    id: stockId,
                    name: cropList[id].name,
                    minUnit: 1,
                    extraData: cropList[id].name,
                    type: cropList[id].type,
                    count: cropCount,
                    tradeable: 0
                });
                console.log(cropTypeList);
                var propertyLength = usingPropertyInstance.getPropertiesLength.call({from:web3.eth.accounts[currentAccount]});
                for(var i = 0 ; i < propertyLength.c[0]; i++){
                    usingPropertyInstance.updatePropertyCount_Cropped(i, parseInt(stockList[stockId].type), parseInt(stockList[stockId].count), {from:web3.eth.accounts[currentAccount], gas:2000000});
                }
                //usingPropertyInstance.addProperty(stockList[stockId].name, stockList[stockId].count, stockList[stockId].minUnit, stockList[stockId].extraData, stockList[stockId].type, stockList[stockId].tradeable, {from:web3.eth.accounts[currentAccount], gas:2000000});

                var configId;
                for (var i = 0 ; i < userLandConfiguration.length ; i++){
                    if (userLandConfiguration[i].crop == id){
                        userLandConfiguration[i].crop = -1;
                        configId = i;
                    }
                }

                usingPropertyInstance.updateUserLandConfiguration(s_Id, configId, -1, 0, 'crop', {from:web3.eth.accounts[currentAccount], gas:2000000});

                cropList[id].name = 0;
                cropList[id].img = 0;
                cropList[id].start = 0;
                cropList[id].end = 0;
                cropList[id].type = 0;
                cropList[id].ripe = 0;

                usingPropertyInstance.updateCropList(s_Id, id, 0, 0, 0, 0, 0, 0, 0, {from:web3.eth.accounts[currentAccount], gas:2000000});

                //cropList.splice(id, 1);
                $("."+cropClass).remove();

                //reload propertyTable
                //set_property_table();
            }
            else if(gameMode == "Thief"){
                if(currentUser.sta < staminaList["steal"]){
                    alert("not enough stamina");
                    return;
                }
                else{
                    var stolenFlag, stealCount, judgement;
                    judgement = Math.random();
                    if(judgement >= 0.5){
                        stolenFlag = $(event.target).parent().attr("stolenFlag");
                        if ((cropList[id].ripe)&&(stolenFlag == "f")){
                            $(".animationImg").html("<img src = '" + prefix+ cropTypeList[typeIndex].img[3] + postfix +"' />");
                            $(".scoreObject").html("+" + 5 +"XP");
                            updateStaminaBar(staminaList["steal"]);
                            updateSyndicateExp(5);
                        }
                        else{
                            alert("Don't be so greedy");
                            return;
                        }
                        var landTop = $(".land").position().top;
                        var landLeft = $(".land").position().left;

                        var areaLeft = $(".gamingArea").position().left;

                        var divHeight =$(".farmObject").height()/5;
                        var divWidth = $(".farmObject").width()/4;

                        var temp = $(".animationObject").clone().attr("class", "animationTemp").appendTo(".canvas");
                        temp.css({display:"inline", top: cursorY-divHeight, left: cursorX-areaLeft+divWidth});
                        temp.addClass("animationTempShow");

                        setTimeout(function(){
                            temp.css({opacity:0, transform:"translateY(0px)"});
                            setTimeout(function(){
                                temp.css({display: "none"});
                                temp.remove();
                            },1000);
                        },1000);
                        stealCount = Math.round(cropCount / 2);
                        cropCount = cropCount - stealCount;
                        var propertyLength = usingPropertyInstance.getPropertiesLength.call({from:web3.eth.accounts[currentAccount]});
                        for(var i= 0; i < propertyLength;i++){
                            usingPropertyInstance.updatePropertyCount_Cropped(i, cropList[id].type, stealCount,{from:web3.eth.accounts[currentAccount], gas:2000000});
                        }
                        usingPropertyInstance.updateCropCount(visitNode, id, cropCount, {from:web3.eth.accounts[currentAccount], gas:2000000});
                        $(event.target).parent().attr("cropcount", parseInt(cropCount));
                        $(event.target).parent().attr("stolenFlag", "t");

                        $("."+cropClass).html("<img src = '" + prefix+ cropTypeList[typeIndex].img[3] + postfix +"' />");
                        //reload propertyTable
                        //set_property_table();
                    }
                    else{
                        alert("You are under arrest!");
                        updateStaminaBar(staminaList["stealFail"]);
                    }
                }
            }
    },

    'click .farm img': function(event){
        if (removeMode){
            var parentClass = $(event.target).parent()[0].className;
            var _landId = parentClass.split("cropLand")[1];

            if (userLandConfiguration[_landId].land == -1){
                alert("Its already empty !");
                return;
            }


            $($(event.target).parent()[0]).css("border", "1px solid black");
            $(event.target).remove();

            userLandConfiguration[_landId].land = -1;
            usingPropertyInstance.updateUserLandConfiguration(s_Id, _landId, -1, -1, 'land', {from:web3.eth.accounts[currentAccount], gas:2000000});
        }

    },

})


Template.crop.events({
    'click .crop button': function (event){
        clickTarget=null;
        if(event.target.className==""){
          clickTarget=$(event.target).parent();
        }else{
          clickTarget=$(event.target);
        }
        var id = clickTarget.parent()[0].className.split("property")[1];

        if (clickTarget.data('pressed')){
            $(".cropObject").css("display", "none");

            // $(event.target).css("background", "#337ab7");
            // $(event.target).css("border-color", "#337ab7");
            // $(event.target).text("Specify");
            clickTarget.html("<img src='/img/game/rake.svg'>")
            clickTarget.data('pressed', false);
            plantMode = false;
            return;
        }

        plantMode = true;

        currentClickedCrop = clickTarget;
        var btns = $(".crop").find("button");

        for (var i = 0 ; i < btns.length; i++){
            if ($(btns[i]).data('pressed')){
                // $(btns[i]).css("background", "#337ab7");
                // $(btns[i]).css("border-color", "#337ab7");
                // $(btns[i]).text("Specify");
                $(btns[i]).html("<img src='/img/game/rake.svg'>")
                $(btns[i]).data('pressed', false);
            }
        }
        clickTarget.data('pressed', true);

        $(".cropObject").html("<img src = '" + prefix+ cropTypeList[id].img[0] + postfix +"' />");
        currentCropId = id;

        $(".cropObject").css("display", "inline");

        // $(event.target).css("background", "gray");
        // $(event.target).css("border-color", "gray");
        // $(event.target).text("Done");
        clickTarget.html("<img src='/img/game/cancel2.svg' width='50%'>")

    },

})

Template.land.events({
    'click .cropLand button': function (event){
        clickTarget=null;
        if(event.target.className==""){
          clickTarget=$(event.target).parent();
        }else{
          clickTarget=$(event.target);
        }

        var id = clickTarget.parent()[0].className.split("farmLand")[1];

        $(".farmObject").html("<img src = '" + prefix+ landTypeList[id].img + postfix +"' />");
        currentLandId = id;
        placeMode = !placeMode;
        if (placeMode){
            $(".farmObject").css("display", "inline");

            // $(event.target).css("background", "gray");
            // $(event.target).css("border-color", "gray");
            // $(event.target).text("Done");
            clickTarget.html("<img src='/img/game/cancel2.svg' width='50%'>")
            currentClickedLand = clickTarget;

        }else{
            // $(event.target).css("background", "#337ab7");
            // $(event.target).css("border-color", "#337ab7");
            // $(event.target).text("Specify");
            $(currentClickedLand).html("<img src='/img/game/shovel.svg'>")
            clickTarget.html("<img src='/img/game/shovel.svg'>")
            $(".farmObject").css("display", "none");
        }
    },


})

Template.gamingArea.events({
    'mouseenter .land div': function (event){
        if (plantMode){
            currentCropLand = event.target.className;
            var top = $(event.target)[0].getBoundingClientRect().top;
            var left = $(event.target)[0].getBoundingClientRect().left;

            var landTop = $(".land").position().top;
            var landLeft = $(".land").position().left;

            var areaLeft = $(".gamingArea").position().left;

            var divHeight =$(".cropObject").height()/5;
            var divWidth = $(".cropObject").width()/4;
            // var divHeight =0;
            // var divWidth = 0;

            var styles = {
                top: top-divHeight,
                left: left-areaLeft+divWidth,
                width:"150px",
                height:"150px",
                position:"absolute",
                opacity:0.5,
                "z-index":2
            };

            $(".cropObject").css(styles);

        }else if (placeMode){
            currentCropLand = event.target.className;
            var top = $(event.target)[0].getBoundingClientRect().top;
            var left = $(event.target)[0].getBoundingClientRect().left;

            var landTop = $(".land").position().top;
            var landLeft = $(".land").position().left;

            var areaLeft = $(".gamingArea").position().left;

            var divHeight =$(".farmObject").height()/5;
            var divWidth = $(".farmObject").width()/4;
            // var divHeight =0;
            // var divWidth = 0;

            $(".farmObject").css({top: top-divHeight, left: left-areaLeft+divWidth, width:"150px", height:"150px", position:"absolute", opacity:0.5});

        }

    },
    'click .matchesBtn':function(event){
        var m_Id = $(event.target).attr("class").split("matchBtn")[1];
        console.log(m_Id);
        MainActivityInstance.updateConfirmation(m_Id, s_Id, 1, {from:web3.eth.accounts[currentAccount], gas:2000000});

        $(event.target).prop("value", "Waiting");
        $(event.target).prop("disabled", true);

    }
})

Template.statusList.events({
    'click .btnSelect': function (e) {

        var temp = panelCounter; // default:2
        $(".statusPanel:nth-child("+panelCounter+")").removeClass("statusPanelShow");
        $(".statusPanel:nth-child("+temp+")").css("z-index", -1);
        $(".crop"+temp+"").css("background-color","rgba(255,255,255,0.45)");
        // setTimeout(function(){
        //   $(".statusPanel:nth-child("+temp+")").css("z-index", -1);
        // },1000);
        if(e.target.className==""){
          panelCounter=$(e.target).parent().prop('className').split("crop")[1];
          $(".crop"+panelCounter+"").css("background-color","rgba(255,255,255,0.65)");
        }else{
          panelCounter = e.target.className.split("crop")[1];
          $(".crop"+panelCounter+"").css("background-color","rgba(255,255,255,0.65)");
        }
        $(".statusPanel:nth-child("+panelCounter+")").css("z-index", 1);
        $(".statusPanel:nth-child("+panelCounter+")").addClass("statusPanelShow");

        if(panelCounter==5){
          set_property_table();
        }
        if (plantMode){
          $(".cropObject").css("display", "none");
          $(".farmObject").css("display", "none");
          // $(currentClickedCrop).css("background", "#337ab7");
          // $(currentClickedCrop).css("border-color", "#337ab7");
          // $(currentClickedCrop).text("Specify");
          $(currentClickedCrop).html("<img src='/img/game/rake.svg'>")
          $(currentClickedCrop).data('pressed', false);
          plantMode = false;
        }else if (placeMode){
          $(".cropObject").css("display", "none");
          $(".farmObject").css("display", "none");
          // $(currentClickedLand).css("background", "#337ab7");
          // $(currentClickedLand).css("border-color", "#337ab7");
          $(currentClickedLand).html("<img src='/img/game/shovel.svg'>")
          // $(currentClickedLand).text("Specify");
          $(currentClickedLand).data('pressed', false);
          placeMode = false;

        }
    },
    'click .removeLand button': function (event){
          removeMode = !removeMode;
          if (removeMode){
              // $(event.target).css("background", "gray");
              // $(event.target).css("border-color", "gray");
              // $(event.target).text("Done");
              $(event.target).html("<img src='/img/game/cancel2.svg' width='30px' height='50px'>");

          }else{
              // $(event.target).css("background", "#337ab7");
              // $(event.target).css("border-color", "#337ab7");
              // $(event.target).text("Specify");
              $(event.target).html("<img src='/img/game/shovel.svg'>");

          }
          console.log(removeMode);
    },
    // for tradable table to save
    'click #btn_tradeable_save':function(){
      save_tradable_setting();
    },
    'click #btn_tradeable_cancel':function(){
      alert('cancel');
    }
})

Template.characterList.events({
    'click .characterSwitch': function (event) {

        loading(1);

        if ($(event.target).html() == "Guard"){
            showThief = true;
            visitNode = getVisitNode();
            rerenderCropLand(visitNode);
            $(event.target).html("Home");
            gameMode = "Guard";
        }else if ($(event.target).html() == "Thief"){
            visitNode = getVisitNode();
            rerenderCropLand(visitNode);
            $('.SyndicateExp').css('visibility', 'visible');
            $('.userExp').css('visibility', 'collapse');
            $(event.target).html("Home");
            $(event.target).parent().append($('<input></input>',{
                                                type:'button',
                                                name:'button',
                                                class:'btn btn-primary nextHome',
                                                value:'Next'
                                            }));
            gameMode = "Thief";
            $('.crop4').css('display','none');
            $('.crop2').css('display','none');
            $('.crop3').css('display','none');

            //$(".crop"+5+"").css("background-color","rgba(255,255,255,0.65)");
            //$(".statusPanel:nth-child("+5+")").css("z-index", 1);
            //$(".statusPanel:nth-child("+5+")").addClass("statusPanelShow");
            //$('.btnSelect').trigger('click');
        }else if ($(event.target).html() == "Home"){
            $(event.target).html(Session.get('userCharacter'));
            showThief = false;
            $(".missionObject").html("<div class='thiefObject'></div>");
            $('.SyndicateExp').css('visibility', 'collapse');
            $('.userExp').css('visibility', 'visible');
            $('.crop4').css('display','block');
            $('.crop2').css('display','block');
            $('.crop3').css('display','block');
            $(event.target).parent().find(".nextHome").remove();
            gameMode = "Farmer"
            rerenderCropLand(s_Id);
        }
    },
    'click .nextHome': function (event) {

        // ===== wait for further testing
        visitNode = getVisitNode();
        rerenderCropLand(visitNode);

    },
    'click .musicSwitch': function (event) {
        if (!audio.paused){
            audio.pause();
            $(".musicSwitch").find("img").attr("src", "/img/game/speaker_on.svg");
        }else{
            audio.play();
            $(".musicSwitch").find("img").attr("src", "/img/game/speaker_off.svg");

        }

    },
    'click .test': function(event){
        GameCoreInstance.playerLevelUp(s_Id, Math.floor(Math.random()*3), {from:web3.eth.accounts[currentAccount], gas:2000000});
        levelUp();
        rerenderCropLand(s_Id);
    },
    'click .matchmaking': function(event){
        MainActivityInstance.findOrigin({from:web3.eth.accounts[0], gas:2000000});
    },
    'click .confirmMatches':function(event){
        MainActivityInstance.checkConfirmation(0, s_Id, {from:web3.eth.accounts[0], gas:2000000});

    }

})

Template.operationList.events({
    'click .menuButton': function(event) {
      if($(".menuButton").hasClass("open")===true){
        $(".rightMenuIcon").fadeOut('normal');
        $(".menuButton").removeClass("open");
      }else{
        $(".rightMenuIcon").fadeIn('normal');
        $(".menuButton").fadeTo("slow", 0.7);
        $(".menuButton").addClass("open");
      }
    },
    'click .shopOpen': function (e) {
        $(".mission_template").css("display", "none");
        $(".property_shop").css("display", "inline");
        set_propertyType_table();
    },
    'click .MissionOpen': function(event){
        $(".property_shop").css("display", "none");
        $(".mission_template").css("display", "inline");
        mission_rending();
    }
})


/////////////////////////
//  Utility Functions  //
/////////////////////////


document.onmousemove = function(e){
    cursorX = e.pageX;
    cursorY = e.pageY;
}

var eventListener = function(){

  // var events = MainActivityInstance.allEvents([{fromBlock: 0, toBlock: 'latest'}]);
  //
  // // watch for changes
  // events.watch(function(error, event){
  //   if (!error)
  //     console.log(event);
  // });

  // Or pass a callback to start watching immediately
  // var event = MainActivityInstance.matchSuccess({} , [{from: 0, to: 'latest'}] , function(error, result){
  //   if (!error)
  //     console.log(result);
  // });
  //
  // var event = MainActivityInstance.matchFail({} , [{fromBlock: 0, toBlock: 'latest'}] , function(error, result){
  //   if (!error)
  //     console.log(result);
  // });

  // watch for an event with {some: 'args'}
var events = MainActivityInstance.matchSuccess({fromBlock: 0, toBlock: 'latest'});
events.watch(function(error, result){
  console.log(result);
});

// would get all past logs again.
events.get(function(error, logs){
    console.log(logs);
});


// would stop and uninstall the filter
//myEvent.stopWatching();

  // MainActivityInstance.matchSuccess({from : 1, to : 'latest'}, { fromBlock: 0, toBlock: 'latest' }).get((error, eventResult) => {
  //   if (error)
  //     console.log('Error in myEvent event handler: ' + error);
  //   else
  //     console.log('myEvent: ' + JSON.stringify(eventResult.args));
  // });

//   var filter = web3.eth.filter({
//     address: MainActivityInstance.address,
//     from: 1,
//     to: 'latest'
//   });
//
//   filter.watch(function (error, log) {
//   console.log(log); //  {"address":"0x0000000000000000000000000000000000000000", "data":"0x0000000000000000000000000000000000000000000000000000000000000000", ...}
// });
//
//   var res = filter.get(function (err, result) {
//       console.log(result);
//   });
//
//   console.log(res);
  // MainActivityInstance.matchSuccess().watch(function(error, result){
  //     if (!error){
  //         console.log(result);
  //     }
  //     console.log(error);
  // });
  //
  // MainActivityInstance.matchFail().watch(function(error, result){
  //     if (!error){
  //         console.log(result);
  //     }
  //     console.log(error);
  // });
}

var showConfirmation = function(s_Id){
    var length = currentUser.matches.length;
    if (length > 0){
        $(".systemInfo").css("opacity", "1");
    }else{
      return;
    }

    for (var i = 0 ; i < length ; i++){

        var data = MainActivityInstance.getMatchMaking.call(currentUser.matches[i], {from:web3.eth.accounts[currentAccount]});
        var owners = data[1];
        var properties = data[2];
        var tradeables = data[3];


        var index;

        for (var j = 0 ; j < owners.length ; j++){
            if (s_Id == owners[j].c[0]){
                index = j;
            }
        }

        var previousIndex = (index-1+owners.length)%owners.length


        var previousName = web3.toUtf8(CongressInstance.getStakeholder.call(parseInt(owners[previousIndex].c[0]), {from:web3.eth.accounts[currentAccount]})[0]);
        var type_Id = usingPropertyInstance.getPropertyType_Matchmaking.call(parseInt(properties[previousIndex].c[0]), {from:web3.eth.accounts[currentAccount]});
        var receiveProperty = usingPropertyInstance.getPropertyType.call(type_Id, {from:web3.eth.accounts[currentAccount]});

        type_Id = usingPropertyInstance.getPropertyType_Matchmaking.call(parseInt(properties[index].c[0]), {from:web3.eth.accounts[currentAccount]});
        var provideProperty = usingPropertyInstance.getPropertyType.call(type_Id, {from:web3.eth.accounts[currentAccount]});

        var row = $("<div>").attr("class", "matches match"+i);
        var fromAddr = $("<div>").text("from "+previousName);
        var receive = $("<div>").text("for " +web3.toUtf8(receiveProperty[0]) + "X" + tradeables[previousIndex].c[0]);
        var provide = $("<div>").text("You exchange " + web3.toUtf8(provideProperty[0]) + "X" + tradeables[index].c[0]);
        row.append(provide).append(receive).append(fromAddr).append($('input').attr( {
            type: 'button',
            class: "btn btn-info matchesBtn matchBtn"+currentUser.matches[i].c[0],
            value: 'Confirm'
        }));



        $(".systemInfo").append(row);

        var confirmed = MainActivityInstance.getMatchMakingConfirmed.call(currentUser.matches[i], s_Id, {from:web3.eth.accounts[currentAccount]});
        if (confirmed){
            $(".matchBtn"+currentUser.matches[i].c[0]).prop("value", "Waiting");
            $(".matchBtn"+currentUser.matches[i].c[0]).prop("disabled", true);

        }
    }

}

var getVisitNode = function(){
    var s_Length = CongressInstance.getStakeholdersLength.call({from:web3.eth.accounts[currentAccount]}).c[0];

    visitNode = s_Id;
    while (visitNode == s_Id){
        visitNode = Math.floor(s_Length*Math.random());
    }
    console.log(visitNode);
    console.log(s_Length);
    return visitNode;
}

//call with caution, this will consume lots of loading time
var fetchAllCropTypes = function(){

    var cropData = [];
    var typesList = [];

    var flag = true;
    var i = 0;
    while (flag){
      try{
        cropData.push(usingPropertyInstance.propertyTypeList(i));
        i++;
      }
      catch(err) {
        flag = false;
      }
    }


    for (var i = 0 ; i < cropData.length ; i++){
        var tempImg = [];
        for (var j = 0 ; j < 4; j++){
            var tempStr =  web3.toUtf8(usingPropertyInstance.getPropertyTypeImg(cropData[i][1].c[0], j, { from:web3.eth.accounts[currentAccount]})).toString();
            tempImg.push(tempStr);
            //tempImg.push(["carrot_seed", "carrot_grow", "carrot_harvest", "carrot"]);
            //tempImg.push("carrot_grow");
        }
        typesList.push({
          name : web3.toUtf8(cropData[i][0]),
          id : cropData[i][1].c[0],
          img: tempImg,
          time: web3.toUtf8(cropData[i][3]),
          count:cropData[i][4].c[0]

        })
    }

    return typesList;
}

var loadCropList = function(s_Id){
    cropList = [];
    var data = usingPropertyInstance.getCropList(s_Id, { from:web3.eth.accounts[currentAccount]});
    var countData = usingPropertyInstance.getCropListCount(s_Id, {from:web3.eth.accounts[currentAccount]});
    var length = usingPropertyInstance.getCropListLength(s_Id, { from:web3.eth.accounts[currentAccount]});
    for (var i = 0 ; i < length ; i++){
      var start = web3.toUtf8(data[3][i]).split(".")[0]+"Z";
      var end = web3.toUtf8(data[4][i]).split(".")[0]+"Z";

      start = start.split("\"")[1];
      end = end.split("\"")[1];

        cropList.push({
            id: data[0][i].c[0],
            name: web3.toUtf8(data[1][i]),
            img: web3.toUtf8(data[2][i]),
            start: new Date(start),
            end: new Date(end),
            type: data[5][i].c[0],
            ripe: data[6][i],
            count: countData[i].c[0]
        });
    }
    console.log(cropList);

}


var getUserStockList = function(s_Id){
    var p_List = CongressInstance.getPropertyList(s_Id, { from:web3.eth.accounts[currentAccount]})
    console.log(p_List);


    var data = [];
    for (var i = 0 ; i < p_List.length ; i++){
        data.push(usingPropertyInstance.getPropertyByOwner(p_List[i].c[0], { from:web3.eth.accounts[currentAccount]}));
    }
    for (var i = 0 ; i < data.length ; i++){
      stockList.push({
          id: data[i][0].c[0],
          name: web3.toUtf8(data[i][1]),
          count: data[i][2].c[0],
          minUnit: data[i][3].c[0],
          extraData: web3.toUtf8(data[i][4]),
          type: data[i][5].c[0],
          tradeable: data[i][6].c[0]
      });
    }
    console.log(stockList);

}

var getUserData = function(s_Id){

    var data = CongressInstance.getStakeholder.call(s_Id, { from:web3.eth.accounts[currentAccount]});
    var syndicateData = CongressInstance.getSyndicateData.call(s_Id, {from:web3.eth.accounts[currentAccount]});
    var matches = CongressInstance.getStakeholderMatches.call(s_Id, { from:web3.eth.accounts[currentAccount]});

    currentUser = {
      id:s_Id,
      address:web3.eth.accounts[currentAccount],

      name: web3.toUtf8(data[0]),
      exp: data[1].c[0],
      totalExp: data[2].c[0],
      type: web3.toUtf8(data[3]),
      landSize: data[4].c[0],
      level:data[5].c[0],
      sta: data[6].c[0],
      guardId: null,
      thiefId: null,
      SyndicateExp:syndicateData[0].c[0],
      SyndicateTotalExp:syndicateData[1].c[0],
      SyndicateLevel:syndicateData[2].c[0]
      matches : matches
    };
    var lastLogin = CongressInstance.getStakeholderLastLogin(s_Id, { from:web3.eth.accounts[currentAccount]});

    if (web3.toUtf8(lastLogin) == 0){
        return;
    }

    lastLogin = web3.toUtf8(lastLogin).split(".")[0]+"Z";
    //
    lastLogin = new Date(lastLogin.split("\"")[1]);
    console.log(lastLogin);

    var difference = elapsedTime(lastLogin, new Date());
    console.log(Math.round(difference.getTime()/(1000*60)));

    currentUser.sta += Math.round(difference.getTime()/(1000*60));
    var staCap = staminaCap(currentUser.level);

    if (currentUser.sta >= staCap ){
        currentUser.sta = staCap;
    }
    // end = end.split("\"")[1];

}

var getLandConfiguration = function(s_Id){
    userLandConfiguration = [];
    var data = usingPropertyInstance.getUserLandConfiguration.call(s_Id, { from:web3.eth.accounts[currentAccount]});

    var contractLandData = data[0];
    var contractCropData = data[1];

    var landSize = currentUser.landSize;
    for (var i = 0 ; i < landSize*landSize ; i++){
        if (contractLandData[i].s != -1){
            contractLandData[i].s = contractLandData[i].c[0];
        }
        if (contractCropData[i].s != -1){
            contractCropData[i].s = contractCropData[i].c[0];
        }
        userLandConfiguration.push(
          {
              id: i,
              land: contractLandData[i].s,
              crop: contractCropData[i].s
          }
        );
    }

    console.log(contractCropData);


}

var fetchGameInitConfig = function(s_Id){
    var cropData = [];
    var landData = [];
    userCropType = [];
    cropTypeList = [];
    landTypeList = [];

    var userCropTypeData = usingPropertyInstance.getUserPropertyType(s_Id, { from:web3.eth.accounts[currentAccount]});
    for (var i = 0 ; i < userCropTypeData[0].length ; i++){
        userCropType.push({
            id: userCropTypeData[0][i].c[0],
            count: userCropTypeData[1][i].c[0],
        });
    }

    console.log(userCropTypeData)
    for (var i = 0 ; i < userCropType.length; i++){
        cropData.push(usingPropertyInstance.propertyTypeList(userCropType[i].id));
    }

    var flag = true;
    var i = 0;

    while (flag){
      try{
        landData.push(usingPropertyInstance.landTypeList(i));
        i++;
      }
      catch(err) {
        flag = false;
      }
    }

    for (var i = 0 ; i < cropData.length ; i++){
        var tempImg = [];
        for (var j = 0 ; j < 4; j++){
            var tempStr =  web3.toUtf8(usingPropertyInstance.getPropertyTypeImg(cropData[i][1].c[0], j, { from:web3.eth.accounts[currentAccount]})).toString();
            tempImg.push(tempStr);
            //tempImg.push(["carrot_seed", "carrot_grow", "carrot_harvest", "carrot"]);
            //tempImg.push("carrot_grow");
        }
        cropTypeList.push({
          name : web3.toUtf8(cropData[i][0]),
          id : cropData[i][1].c[0],
          img: tempImg,
          time: web3.toUtf8(cropData[i][3]),
          count:cropData[i][4].c[0]

        })
    }
    _crop.changed();

    console.log(cropTypeList);

    for (var i = 0 ; i < landData.length ; i++){

        landTypeList.push({
          id : landData[i][0].c[0],
          name : web3.toUtf8(landData[i][1]),
          img: web3.toUtf8(landData[i][2]),
          count:landData[i][3].c[0]

        })
    }

}

var hex2a = function(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

var loading = function(on){
    var opacity;
    $(".cropObject").css("display", "none");
    if (on){
        $(".loading").css("display", "flex");
        opacity = 0.7;
    }else{
        setTimeout(function(){
            $(".loading").css("display", "none");
        },1000);
        opacity = 0;

    }
    $(".loading").css("opacity", opacity);


}

var rerenderCropLand = function(id){
  getLandConfiguration(id);
  loadCropList(id);
  fetchGameInitConfig(id);
  initCropLand(id);

  getUserStockList(id);
  loading(0);

}

var initCropLand = function(id){

    $('.land').html("");
    $(".surfaceObject").html("");
    $(".surfaceObject").append("<div class='cropObject'></div>");

    $('.land').css("width", blockSize*currentUser.landSize );
    $('.land').css("height", blockSize*currentUser.landSize );

    for (var i = 0 ; i < currentUser.landSize*currentUser.landSize; i++){
        $('.land').append("<div class='farm cropLand" + i + "'></div>");
        if (userLandConfiguration[i].land == -1){
            $('.cropLand'+i).css("border", '1px solid black');
        }
        //$('.land').append("<div></div>");
    }

    var theifId = 0;
    for (var i = 0 ; i < userLandConfiguration.length ; i++){

        if (userLandConfiguration[i].land == -1){
            continue;
        }
        $(".farmObject").html("<img src = '" + prefix+ landTypeList[userLandConfiguration[i].land].img + postfix +"' />");
        $( ".farmObject" ).children().clone().appendTo(".cropLand"+ i).css({opacity:1});


        if (userLandConfiguration[i].crop == -1){
            continue;
        }

        //currentCropLand = event.target.className;
        var top = $('.cropLand'+i)[0].getBoundingClientRect().top;
        var left = $('.cropLand'+i)[0].getBoundingClientRect().left;

        var landTop = $(".land").position().top;
        var landLeft = $(".land").position().left;

        var areaLeft = $(".gamingArea").position().left;

        var divHeight =$(".cropObject").height()/5;
        var divWidth = $(".cropObject").width()/4;
        // var divHeight =0;
        // var divWidth = 0;
        var styles = {
            top: top-divHeight,
            left: left-areaLeft+divWidth,
            width:"150px",
            height:"150px",
            position:"absolute",
            opacity:1,
            "z-index":2
        };


        var index = userLandConfiguration[i].crop;
        if (index == -1){
          return;
        }

        var difference = elapsedTime(new Date(), cropList[index].end);
        var originDifference = elapsedTime(cropList[index].start, cropList[index].end);
        var percent = difference/originDifference;


        var typeIndex;
        for (var j = 0 ; j < cropTypeList.length ; j++){
            if (cropTypeList[j].id == cropList[index].type){
                typeIndex = j;
            }
        }


        if (percent <= 0.6){
            $(".cropObject").html("<img src = '" + prefix+ cropTypeList[typeIndex].img[1] + postfix +"' />");
        }
        if (percent <= 0){
            $(".cropObject").html("<img src = '" + prefix+ cropTypeList[typeIndex].img[2] + postfix +"' />");
            //cropList[i].ripe = 1;
        }
        //0430 wait to change stolen svg
        var stolenFlag = "f";
        if(cropList[index].count != cropTypeList[typeIndex].count){
            $(".cropObject").html("<img src = '" + prefix+ cropTypeList[typeIndex].img[3] + postfix +"' />");
            stolenFlag = "t";
        }

        //var diffData = (difference.getDate()-1)+" Days. "+(difference.getHours()-8)+' Hrs. '+difference.getMinutes()+' Mins. '+difference.getSeconds()+" Secs";
        //$(".currentCrop"+index).html(diffData);


        //$(".cropObject").html("<img src = '" + prefix+ cropTypeList[config[i].crop].img[0] + postfix +"' />");
        $( ".cropObject" ).clone().attr("class","croppedObject croppedObject"+index).attr("cropCount", cropList[index].count).attr("stolenFlag", stolenFlag).appendTo(".surfaceObject").css(styles);

        if (showThief){
          var missionStyles = {
              top: top-divHeight,
              left: left-areaLeft+divWidth,
              width:"150px",
              height:"150px",
              position:"absolute",
              opacity:1,
              "z-index":5,
              display:'inline'
          };


          var prob = Math.random()*3;
          if (prob > 2){
            $(".thiefObject").html("<img src = '/img/game/thief.gif' />");
            $( ".thiefObject" ).clone().attr("class","thief thief"+theifId++).appendTo(".missionObject").css(missionStyles);
          }
        }else{
            $(".missionObject").html("<div class='thiefObject'></div>");
        }

    }
}

var levelCap = function(n){
    var powerResult = 1;
    for (var i = 0 ; i < n ; i++){
        powerResult *= 2;
    }
    return powerResult*100;
}

var SyndicateLevelCap = function(n){
    return n * 100;
}

var staminaCap = function(n){
    return 100+n*10;
}

var updateStaminaBar = function(consumedSta){
    var staCap = staminaCap(currentUser.level);

    currentUser.sta -= consumedSta;
    var percent = (currentUser.sta/staCap)*100;
    $(".staProgressBar").css("width", percent + "%");
    $(".staText").text(currentUser.sta+"/"+staCap);
}


var updateUserStamina = function(){
    var staCap = staminaCap(currentUser.level);
    if (currentUser.sta >= staCap){
        return;
    }
    currentUser.sta += 1;
    updateStaminaBar(0);

}

var updateUserExp = function(exp){
  currentUser.exp += parseInt(exp);
  currentUser.totalExp += currentUser.exp;
  var lvlCap = levelCap(currentUser.level);

  if  (currentUser.exp >= lvlCap){

    currentUser.level += 1;
    _character.changed();
    Session.set('userLevel', currentUser.level);

    currentUser.exp = currentUser.exp - lvlCap;

    CongressInstance.updateUserExp(s_Id, currentUser.exp, {from:web3.eth.accounts[currentAccount], gas:2000000});

    GameCoreInstance.playerLevelUp(s_Id, Math.floor(Math.random()*3), {from:web3.eth.accounts[currentAccount]});
    levelUp();
    rerenderCropLand(s_Id);
    lvlCap = levelCap(currentUser.level);
  }else{
    CongressInstance.updateUserExp(s_Id, currentUser.exp, {from:web3.eth.accounts[currentAccount], gas:2000000});
  }

  var percent = (currentUser.exp/lvlCap)*100;
  $(".expProgressBar").css("width", percent + "%");
  $(".expText").text(currentUser.exp+"/"+lvlCap);

}

var updateSyndicateExp = function(exp){
    currentUser.SyndicateExp += parseInt(exp);
    currentUser.SyndicateTotalExp += currentUser.SyndicateExp;
    var lvlCap = SyndicateLevelCap(currentUser.SyndicateLevel);

    if  (currentUser.SyndicateExp >= lvlCap){

        currentUser.SyndicateLevel += 1;
        _character.changed();
        Session.set('SyndicateLevel', currentUser.SyndicateLevel);

        currentUser.SyndicateExp = currentUser.SyndicateExp - lvlCap;

        levelUp('Syndicate');
        lvlCap = SyndicateLevelCap(currentUser.SyndicateLevel);
    }
    CongressInstance.updateSyndicateExp(s_Id, currentUser.SyndicateExp, currentUser.SyndicateLevel,{from:web3.eth.accounts[currentAccount], gas:2000000});


    var percent = (currentUser.SyndicateExp/lvlCap)*100;
    $(".SyndicateExpProgressBar").css("width", percent + "%");
    $(".SyndicateExpText").text(currentUser.SyndicateExp+"/"+lvlCap);

}

var levelUp = function(_type){
    if(_type == 'userLevel'){
        Session.set('Levelup', currentUser.level);
    }
    else{
        Session.set('Levelup', currentUser.SyndicateLevel);
    }
    var opacity;
    $(".levelUp").css("display", "flex");
    $(".levelUp").css("opacity", 1);

    setTimeout(function(){
      $(".levelUp").css("opacity", 0);

      setTimeout(function(){
        $(".levelUp").css("display", "none");

      }, 5000);

    },5000);


}

var checkMission = function(){

    if (showThief){


    }
}

var cropSummaryUpdate = function(){
    for (var i = 0 ; i < cropList.length ; i++){
        if (cropList[i].name == 0 || cropList[i].ripe ){
            continue;
        }
        var difference = elapsedTime(new Date(), cropList[i].end);
        var originDifference = elapsedTime(cropList[i].start, cropList[i].end);
        //var percentage = (1 - (difference / originDifference))*100;
        // console.log(percentage);
        // if (percentage > 100){
        //   continue;
        // }
        //$(".currentCrop"+i).css("width", percentage+"%");
        var percent = difference/originDifference;

        var index;
        for (var j = 0 ; j < cropTypeList.length ; j++){
            if (cropTypeList[j].id == cropList[i].type){
                index = j;
            }
        }

        if (percent <= 0.6){
            $(".croppedObject"+cropList[i].id).find("img").attr("src",prefix+cropTypeList[index].img[1]+postfix);
        }
        if (percent <= 0){
            $(".croppedObject"+cropList[i].id).find("img").attr("src",prefix+cropTypeList[index].img[2]+postfix);
            cropList[i].ripe = 1;
            $(".currentCrop"+cropList[i].id).parent().remove();
            continue;
        }

        //var diffData = (difference.getDate()-1)+" Days. "+(difference.getHours()-8)+' Hrs. '+difference.getMinutes()+' Mins. '+difference.getSeconds()+" Secs";
        var diffData = (difference.getHours()-8)+' Hrs. '+difference.getMinutes()+' Mins. '+difference.getSeconds()+" Secs";
        $(".currentCrop"+i).html(diffData);
    }
}

var elapsedTime = function(start, end){

    //var elapsed = end.getTime() - start.getTime();

    var elapsed = end - start; // time in milliseconds
    var difference = new Date(elapsed);
    //var diff_days = difference.getDate();

    //var diff_hours = difference.getHours();
    //var diff_mins = difference.getMinutes();
    //var diff_secs = difference.getSeconds();

    //return difference;
    return difference;

}



// var farmObjectLoader = function(){
//     $('.land').css("width", blockSize*currentUser.landSize );
//     $('.land').css("height", blockSize*currentUser.landSize );
//
//     for (var i = 0 ; i < currentUser.landSize*currentUser.landSize; i++){
//         $('.land').append("<div class='farm cropLand" + i + "' style='border:1px solid black; border-style:solid;'></div>");
//     }
// }


/////////////////////////
//  Shop Functions  //
/////////////////////////

get_user_property_setting = function () {
    user_property = [];
    var propertyLength = usingPropertyInstance.getPropertiesLength.call({from:web3.eth.accounts[currentAccount]});
    for(i = 0; i < propertyLength;i++){
        var property_data = usingPropertyInstance.getProperty_Shop(i, {from:web3.eth.accounts[currentAccount]});
        if(web3.eth.accounts[currentAccount] == property_data[2]){
            var data = {"id":i, "propertyType":property_data[0].c[0], "name":hex2a(property_data[1]), "propertyCount":property_data[3].c[0],  "tradeable":property_data[4].c[0], "img": web3.toUtf8(property_data[5])};
            user_property.push(data);
        }
    }
}

get_propertyType_setting = function(){
    display_field = [];
    var propertyTypeLength = usingPropertyInstance.getPropertyTypeLength.call(0, {from:web3.eth.accounts[currentAccount]});

    for(i = 0; i < propertyTypeLength.c[0]; i++){
        var property_type = usingPropertyInstance.getPropertyType.call(i,currentAccount, {from:web3.eth.accounts[currentAccount]});
        var property_type_rating = usingPropertyInstance.getPropertyTypeRating.call(i,{from:web3.eth.accounts[currentAccount]});
        console.log(property_type_rating);

        var data = {"name":hex2a(property_type[0]),"id": property_type[1].c[0],"rating":property_type_rating.c[0]/floatOffset,"averageRating":property_type[2].c[0]/floatOffset};
        display_field.push(data);
    }
}

set_property_table = function(){
    get_user_property_setting();
    var table, tr, td, heart_path, heart_status;
    heart_path = ['./img/heart-outline.png','./img/heart_filled.png'];

    $('.tradeable_content').html('');
    table = $('<table></table>').attr('id', 'property_trade_table')
                                .attr('class', 'property_shop_table');
    //header
    tr = $('<tr></tr>');
    tr.append($('<th></th>'));
    tr.append($('<th></th>').text('Property'));
    tr.append($('<th></th>').text('Stock'));
    tr.append($('<th></th>').text('Tradable'));
    table.append(tr);
    //header
    //content
    for(i = 0; i < user_property.length; i++){
        if((parseInt(user_property[i].propertyCount,10) == 0) &&  (parseInt(user_property[i].tradeable,10) == 0)){
            //don't hold any stock
        }
        else{
            tr = $('<tr></tr>');
            td = $('<td></td>');
            td.append($('<img></img>', {
                src:prefix+user_property[i].img + postfix,
                style:'width:50px; height:50px'
            }));
            tr.append(td);
            td = $('<td></td>');
            td.text(user_property[i].name);
            tr.append(td);
            td = $('<td></td>');
            td.text(user_property[i].propertyCount);
            tr.append(td);
            td = $('<td></td>');
            td.append(
                    $('<input></input>',{
                        type:'text',
                        class:'shop_tradable_input',
                        id:'tradable_input_' + user_property[i].id,
                        value:user_property[i].tradeable
                    })
                    .on('keydown',function (e) {
                        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
                            (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                            (e.keyCode >= 35 && e.keyCode <= 40)) {
                            return;
                        }
                        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                            e.preventDefault();
                        }
                    })
                    .on('change',function(e){
                        var _id = index_finder($(this).attr('id'), 'tradable_input_');
                        if(parseInt($(this).val(),10) > parseInt($('#shop_stock_' + _id).val())){
                            $(this).val($('#shop_stock_' + _id).val());
                        }
                        $('#shop_stock_' + _id)[0].parentNode.previousSibling.textContent= parseInt($('#shop_stock_' + _id).val(),10) -  parseInt($(this).val(),10);
                    })
                    .on('click', function(){
                        $(this).select();
                    })
                    );
            td.append($('<input></input>',{
                type:'hidden',
                id:'shop_stock_' + user_property[i].id,
                value: parseInt(user_property[i].propertyCount,10) + parseInt(user_property[i].tradeable,10)
            }));
            tr.append(td);
            table.append(tr);
        }
    }
    //content
    //control bar
    // tr = $('<tr></tr>');
    // td = $('<td></td>').attr('colspan', 4).attr('style','textalign=cneter;');
    // td.append($('<input>').attr( {
    //     type: 'button',
    //     id: 'btn_property_save',
    //     value: 'SAVE'
    // }).on('click', function () {
    //     save_tradable_setting();
    // }));
    // td.append($('<input>').attr( {
    //     type: 'button',
    //     id: 'btn_property_cancel',
    //     value: 'CANCEL'
    // }).on('click', function () {
    //     alert('cancel');
    // }));
    // tr.append(td);
    table.append(tr);
    //control bar
    $('.tradeable_content').append(table);
}

index_finder = function(_source, _mask){
    var res = _source.substring(_mask.length, _source.length);
    return res;
}

set_propertyType_table = function () {

    var table, tr, td, property_index;

    get_propertyType_setting();
    $('.shop_content').html('');
    table = $('<table></table>').attr('id', 'property_table')
                                .attr('class', 'property_shop_table');
    //header
    tr = $('<tr></tr>');
    tr.append($('<th></th>').text('Property'));
    tr.append($('<th></th>').text('Rating'));
    tr.append($('<th></th>').text('AVG Rating'));
    table.append(tr);
    //header
    //content
    for (i = 0; i < display_field.length; i++) {
        tr = $('<tr></tr>');
        tr.append($('<td></td>').text(display_field[i].name));
        //tr.append($('<td></td>').text(display_field[i].propertyCount));
        td = $('<td></td>');
        td.append($('<input>', {
            type: 'range',
            value: display_field[i].rating,
            max: 100,
            min: 0,
            step: 1,
            id: 'rating' + i
        }).on('change', function () {
            $('label[for = ' + $(this).attr('id') + ']').html($(this).val());
        })
        );
        td.append($('<label>').attr('for', 'rating' + i).html(display_field[i].rating));
        tr.append(td);
        tr.append($('<td></td>').text(display_field[i].averageRating));
        table.append(tr);
    }
    //content
    //control bar
    tr = $('<tr></tr>');
    td = $('<td></td>').attr('colspan', 3);
    td.append($('<input>').attr( {
        type: 'button',
        id: 'btn_property_save',
        value: 'SAVE',
        class:'hvr-rectangle-out'
    }).on('click', function () {
        save_rating_setting();
        $('.property_shop').css('display', 'none');
    }));
    td.append($('<input>').attr( {
        type: 'button',
        id: 'btn_property_cancel',
        value: 'CANCEL',
        class:'hvr-rectangle-out'
    }).on('click', function () {
        alert('cancel');
    }));
    tr.append(td);
    table.append(tr);
    //control bar
    $('.shop_content').append(table);
}

save_tradable_setting = function(){
    for(i = 0; i < $('.shop_tradable_input').length; i++){
        var _id = index_finder( $('.shop_tradable_input')[i].id, 'tradable_input_');
        var _tradable = $('#tradable_input_' + _id).val();
        var _propertyCount = parseInt($('#shop_stock_' + _id).val(),10) - parseInt(_tradable,10);
        usingPropertyInstance.updatePropertyCount(_id,_propertyCount,_tradable, {from:web3.eth.accounts[currentAccount],gas:200000});
    }
}

save_rating_setting = function () {
    //for (i = 0; i < user_property.length; i++) {
    //    user_property[i].rating = $('#rating' + i).val();
    //}
    //property_log[account_index].property = user_property;
    //$('#json_temp').val(JSON.stringify(property_log));
    //averageRating_calculation();
    for(i = 0; i < display_field.length;i++){
        var _id = parseInt(display_field[i].id,10);
        var _rate = parseInt($('#rating' + i).val(),10);
        usingPropertyInstance.updatePropertyTypeRating(_id, _rate*floatOffset, "update", {from:web3.eth.accounts[currentAccount],gas:200000});
    }


}

averageRating_calculation = function () {
    for (i = 0; i < property_database.length; i++) {
        property_database[i].averageRating = 0;
        delete property_database[i].rating;
    }

    for (i = 0; i < property_log.length; i++) {
        for (j = 0; j < property_log[i].property.length; j++) {
            for (k = 0 ; k < property_database.length; k++) {
                if (property_database[k].id == property_log[i].property[j].id) {
                    property_database[k].averageRating = parseInt(property_database[k].averageRating, 10) + parseInt(property_log[i].property[j].rating, 10);
                    break;
                }
            }
        }
    }
    for (i = 0; i < property_database.length; i++) {
        n = parseInt(property_database[i].averageRating, 10) / property_log.length;
        property_database[i].averageRating = n.toFixed(2);
    }
    $('#temp_property').val(JSON.stringify(property_database));
}


/////////////////////////
//  Mission Functions  //
/////////////////////////
var mission_list = [];

get_mission_list = function(){
    var item, result, _cropId, _cropName, _quantity, _missionId, _missionName, _exp, _lvl_limitation, _accountStatus;
    var mission_count = GameCoreInstance.getMissionsLength.call({from: web3.eth.accounts[currentAccount]});
    mission_list = [];

    for(i = 0; i < mission_count.c[0]; i++){
        mission_source = GameCoreInstance.getMission.call(i, {from:web3.eth.accounts[currentAccount]});
        item_length = GameCoreInstance.getMissionItemsLength.call(i, {from:web3.eth.accounts[currentAccount]});
        mission = {id: i, name:$.trim(web3.toUtf8(mission_source[0])), exp: mission_source[1].c[0], lvl_limitation: mission_source[2].c[0], solved:mission_source[3],items:[]};

        if(mission.lvl_limitation ===999){}
        else{
            for(j = 0; j < item_length.c[0];j++){
                item_source = GameCoreInstance.getMissionItems.call(i, j, {from:web3.eth.accounts[currentAccount]});
                item = {crop_id:item_source[0].c[0], crop_name: web3.toUtf8(item_source[1]), quantity:item_source[2].c[0], img:web3.toUtf8(item_source[3])};
                mission.items.push(item);
            }
            mission_list.push(mission);
        }
    }
}
mission_rending = function(){

    get_mission_list();
    $('.mission_template').html('');
    $('.mission_template').append($('<button></button>',{
        type:'button',
        id:'btn_mission_close',
        html:$("<img>",{src:"/img/game/cancel.svg",alt:""})
    })
    .on('click', function(){ $('.mission_template').css('display','none'); })
    );

    var div, table, tr, td;
    div=$('<div></div>',{class:'mission_content'})
    table = $('<table></table>',{id:'mission_table'});
    //header
    tr = $('<tr></tr>');
    tr.append($('<th></th>').text('Mission'));
    tr.append($('<th></th>').text('Requirement'));
    tr.append($('<th></th>').text('Exp'));
    tr.append($('<th></th>').text('Submit'));
    table.append(tr);
    //header
    //content
    for(i = 0; i < mission_list.length;i++){

        if(!mission_list[i].solved){
            tr = $('<tr></tr>');
            td = $('<td></td>',{
                text:mission_list[i].name
            });
            tr.append(td);
            td = $('<td></td>');
            for(j = 0; j < mission_list[i].items.length; j++){
                td.append($('<img></img>',{
                    src: prefix + mission_list[i].items[j].img+postfix,
                    alt:mission_list[i].items[j].crop_name
                }));
                td.append($('<span></span>',{
                    text: ' X ' + mission_list[i].items[j].quantity
                }));
            }
            tr.append(td);
            td = $('<td></td>',{
                text:  mission_list[i].exp
            });
            tr.append(td);
            td = $('<td></td>');
            td.append($('<input></input>',{
                type:'hidden',
                id:'mission_exp_' + mission_list[i].id,
                value:mission_list[i].exp
            }));
            td.append($('<input></input>',{
                type:'hidden',
                id:'mission_id_' + mission_list[i].id
            }));

            td.append($('<input></input>',{
                type:'button',
                value:'Submit',
                id:'btn_mission_submit_' + mission_list[i].id
            })
            .on('click', function(){
                var _id =index_finder($(this).prev('input').attr('id'),'mission_id_');
                var mission_qualify = mission_qualify_check(_id);
                if(mission_qualify){
                    mission_submit(_id);
                }
            })
            );
        }
        tr.append(td);
        table.append(tr);
        div.append(table);
    }
    //content
    $('.mission_template').append(div);
    get_user_property_setting();
    for(k = 0; k < mission_list.length;k++){
        mission_qualify_check(mission_list[k].id);
    }
}

mission_submit = function(_id){
    updateUserExp(parseInt($('#mission_exp_' + _id).val(),10));
    GameCoreInstance.submitMission(_id,  { from: web3.eth.accounts[currentAccount], gas: 2000000 });
    mission_rending();
}

mission_qualify_check = function(_id){

    var target_mission;
    for(i = 0; i < mission_list.length; i++){
        if(mission_list[i].id == _id){
            target_mission = mission_list[i];
            break;
        }
    }
    var qualify = false;
    for(i = 0; i < target_mission.items.length; i++){
        qualify = false;
        for(j =0; j < user_property.length; j++){
            if(user_property[j].propertyType == target_mission.items[i].crop_id){
                if(parseInt(user_property[j].propertyCount,10) >= parseInt(target_mission.items[i].quantity,10)){
                    qualify = true;
                }
                else{
                    qualify = false;
                }
                break;
            }
        }
        if(!qualify){
            break;
        }
    }

    if(qualify){
        $('#btn_mission_submit_' + _id).css('display', 'block');
        return (true);
    }
    else {
        $('#btn_mission_submit_' + _id).css('display', 'none');
        return (false);
    }
}
