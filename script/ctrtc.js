(function (window) {
    var Ctrtc = (function () {
        "use strict";
        var Ctrtc = {};

        /*Object.defineProperties(Ctrtc, {
         version: {
         get: function(){ return '1.0.0'; }
         },
         name: {
         get: function(){ return 'Ctrtc'; }
         }
         });*/

        return Ctrtc;
    }());


    /**
     * @fileoverview Connection
     */


    var device = function () {
        var UA, level, serverInfo, lastStackEvent, soundPlayer, audioSelect, videoSelect;
        var app_callbacks = {};
        var cfg_account = {};
        var cfg_serverinfolist;
        //add by chm 20150608
        var roomInfo = {};
        var isCreater = false;
        var curRoom = '';
        var hasError = false;
        var cfg_jssip = {
            uri: null,
            password: null,
            ws_servers: null,
            display_name: null,
            register: true,
            register_expires: 600,
            registrar_server: '',
            no_answer_timeout: 60000,
            trace_sip: false,
            stun_servers: [],
            turn_servers: [],
            use_preloaded_route: false,
            connection_recovery_min_interval: 2,
            connection_recovery_max_interval: 30,
            hack_via_tcp: false,
            hack_ip_in_contact: false
        };

        function getServerInfo() {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', cfg_account.serverAddrSvr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/ServerAddress?ctcors=cors", false);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    if (typeof(JSON) == 'undefined') {
                        cfg_serverinfolist = eval("(" + xhr.responseText + ")");
                    } else {
                        cfg_serverinfolist = JSON.parse(xhr.responseText);
                    }

                    if (cfg_serverinfolist.code != "0") return;
                    for (var serverInfoIdx in cfg_serverinfolist.serverInfolist) {
                        var serverInfo = cfg_serverinfolist.serverInfolist[serverInfoIdx];
                        if (serverInfo.serverType == "Proxy") {
                            /*if(serverInfo.transPortType == "WS"){
                             var ws_servers_addr = '["ws://' + serverInfo.address.join("\",\"ws://") + '"]';
                             cfg_jssip.ws_servers = JSON.parse(ws_servers_addr);			 				
                             }*/
                            if (serverInfo.transPortType == "WSS") {
                                var ws_servers_addr = '["wss://' + serverInfo.address.join("\",\"wss://") + '"]';
                                cfg_jssip.ws_servers = JSON.parse(ws_servers_addr);
                            }
                        }

                        if (serverInfo.serverType == "TURN") {
                            var stun_server_addr;
                            var turn_server_addr;

                            stun_server_addr = "stun:" + serverInfo.address[0];

                            if (serverInfo.transPortType == "TLS")
                                turn_server_addr = "turns:" + serverInfo.address[0];
                            else
                                turn_server_addr = "turn:" + serverInfo.address[0];

                            var servers_auth = serverInfo.serverConfig.split("~");
                            var stun_servers = {
                                server: stun_server_addr,
                                username: servers_auth[0],
                                password: servers_auth[1]
                            };
                            var turn_servers = {
                                server: turn_server_addr,
                                username: servers_auth[0],
                                password: servers_auth[1]
                            };
                            cfg_jssip.stun_servers.push(stun_servers);// = stun_servers;
                            cfg_jssip.turn_servers.push(turn_servers);// = turn_servers;	 				
                        }

                        if (serverInfo.serverType == "REST") {
                            //modified by chm 20151221 to adapt https
                            if (serverInfo.transPortType == "HTTPS")
                                cfg_account.restSvrAddr = "https://test1.chinartc.com:8449";//"https://" + serverInfo.address[0];
                            else
                                cfg_account.restSvrAddr = "https://test1.chinartc.com:8449";//"http://" + serverInfo.address[0];
                        }

                        if (serverInfo.serverType == "MCUAPI") {
                            if (serverInfo.transPortType == "HTTPS")
                                cfg_account.mcuApiSvrAddr = "https://" + serverInfo.address[0];
                            else
                                cfg_account.mcuApiSvrAddr = "http://" + serverInfo.address[0];
                        }
                    }
                    JsSIP.C.USER_AGENT = "<Browser>,<" + cfg_jssip.terminalSN + ">,<" + Ctrtc.version + ">";
                    UA = new JsSIP.UA(cfg_jssip);
                }
            }
            xhr.send();
        }

        function stackEvent(e) {
            switch (e.type) {
                case 'registered':
                    if (app_callbacks.cb_ready && !hasError)
                        app_callbacks.cb_ready({info: "准备就绪"});
                    break;
                case 'newRTCSession':
                    connection = new Ctrtc.Connection(e, app_callbacks, cfg_account);
                    connection.regCallback(app_callbacks, connection, soundPlayer);
                    break;
                case 'notifyKickby':
                    lastStackEvent = 'kicked';//when being kicked,there are two events coming consequncely,first is kicked ,last is disconnected,we only inform user first event
                    if (app_callbacks.cb_deverr) {
                        app_callbacks.cb_deverr({info: 'kicked'});
                    }
                    break;
                case 'registrationFailed':
                    //modified by chm 20150422
                    if (app_callbacks.cb_deverr) {
                        app_callbacks.cb_deverr({info: e.data.cause});//'registrationFailed'});
                    }
                    break;
                case 'disconnected':
                    if (lastStackEvent != 'kicked' && app_callbacks.cb_deverr) {
                        //modified by chm 20150525
                        hasError = false;
                        app_callbacks.cb_deverr({info: 'Disconnected , please wait for reconnection!'});
                    }
                    break;
                /*
                 case 'failed':
                 if(app_callbacks.cb_deverr){
                 hasError = true;
                 app_callbacks.cb_deverr({info:e.data.cause});
                 }
                 break;
                 */
                case 'newMessage':
                    //add by chm 20150525
                    if (e.data.originator === 'remote') {
                        app_callbacks.cb_message({info: e.data.request.body});
                    }
                    break;
                case 'notifyRoom':
                    if (app_callbacks.cb_room) {
                        //add by chm 20151126: to help judge who is the creater
                        mcu_querymembers({reqType: 'noCallBack'});
                        var eventRoom;
                        if (typeof(JSON) == 'undefined') {
                            eventRoom = eval("(" + e.data.body + ")");
                        } else {
                            eventRoom = JSON.parse(e.data.body);
                        }
                        var cb_info = {info: "room状态变更", roomId: eventRoom.ChangedInfo.callID, reqType: 'roomEvent'};
                        //add by chm 20150608
                        var temp = eventRoom.ChangedInfo.callID;
                        if (curRoom == temp) {
                            isCreater = true;
                        } else {
                            roomInfo.roomId = temp;
                            roomInfo.roomPasswd = '';
                            isCreater = false;
                        }

                        cb_info.members = new Array();
                        for (var i = 0; i < eventRoom.ChangedInfo.memberlist.length; i++) {
                            var memStatus;
                            var member = eventRoom.ChangedInfo.memberlist[i];
                            switch (member.memberStatus) {
                                case 1:
                                    memStatus = 'prepareing';
                                    break;
                                case 2:
                                    memStatus = 'joined';
                                    break;
                                case 3:
                                    memStatus = 'unjoined';
                                    break;
                                case 4:
                                    memStatus = 'deleted';
                                    break;
                                case 5:
                                    memStatus = 'ringring';
                                    break;
                            }
                            cb_info.members.push({
                                member: eventRoom.ChangedInfo.memberlist[i].appAccountID,
                                status: memStatus
                            });
                        }
                        app_callbacks.cb_room(cb_info);
                    }
                    break;
                default:
                    break;
            }
            console.log(e);
        }

        function gotSources(sourceInfos) {
            for (var i = 0; i !== sourceInfos.length; ++i) {
                var sourceInfo = sourceInfos[i];
                var option = document.createElement('option');
                option.value = sourceInfo.id;
                if (sourceInfo.kind === 'audio') {
                    option.text = sourceInfo.label || 'microphone ' + (audioSelect.length + 1);
                    if (audioSelect != null)
                        audioSelect.appendChild(option);
                } else if (sourceInfo.kind === 'video') {
                    option.text = sourceInfo.label || 'camera ' + (videoSelect.length + 1);
                    if (videoSelect != null)
                        videoSelect.appendChild(option);
                } else {
                    console.log('Some other kind of source: ', sourceInfo);
                }
            }
        }

        function mcu_createroom(options) {
            if (UA.curSession !== null) {
                alert("Create room failed! You already exist in a room!");
                return;
            }
            var xhr = new XMLHttpRequest();

            var mcu_paras = {
                gvccreatorCalbackMethod: "Post",
                gvccreatorCalbackURL: "",
                gvccreator: cfg_account.rtcacc_notermtype,
                gvccreatorTerminalType: "Browser",
                gvcattendingPolicy: 1
            };

            if (options.roomName)
                mcu_paras.gvcname = options.roomName;
            else
                mcu_paras.gvcname = "room_" + cfg_account.appacc;

            if (options.roomPasswd)
                mcu_paras.gvcpassword = options.roomPasswd;
            else
                mcu_paras.gvcpassword = "ctbri";

            if (options.mediaType && options.mediaType == "video") {
                if (options.roomType && options.roomType == "broadcast")
                    mcu_paras.gvctype = 29;
                else
                    mcu_paras.gvctype = 20;
            }
            else {
                if (options.roomType && options.roomType == "broadcast")
                    mcu_paras.gvctype = 9;
                else
                    mcu_paras.gvctype = 0;
            }
            //add by chm 20150601
            if (options.maxmember)
                mcu_paras.gvcmaxmember = parseInt(options.maxmember);
            if (options.codeMode)
                mcu_paras.codec = parseInt(options.codeMode);
            if (options.screenMode)
                mcu_paras.screenSplit = parseInt(options.screenMode);
            if (options.audioMode)
                mcu_paras.lv = parseInt(options.audioMode);
            if (options.roomMode)
                mcu_paras.initMode = parseInt(options.roomMode);
            if (options.roomDuration)
                mcu_paras.maxDuration = parseInt(options.roomDuration);
            if (options.autoSwitchPicture)
                mcu_paras.autoSwitchPicture = parseInt(options.autoSwitchPicture);

            var members = new Array();
            members.push({"appAccountID": cfg_account.rtcacc});
            var mems = options.roomMembers.split(',');
            for (var i = 0; i < mems.length; i++) {//modified by chm 20150425 to avoid multi-create
                if (mems[i] != "" && mems[i] != cfg_account.appacc)//modified by chm 20150608 to adapt callee query 
                {
                    if (mems[i].indexOf('@') !== -1) {
                        mems[i] = Ctrtc.Method.encode_char(mems[i]);
                    }
                    members.push({"appAccountID": (cfg_account.accType + "-" + mems[i] + "~" + cfg_account.appid + "~Any")});
                }
            }
            mcu_paras.gvcinviteeList = members;

            xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/GVCType/" + mcu_paras.gvctype + "/GroupCall", true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (app_callbacks.cb_room) {
                        if (res.code == "200" || res.code == "0") {
                            //add by chm 20150608: the creater
                            curRoom = res.callId;
                            roomInfo.roomId = res.callId;
                            roomInfo.roomPasswd = mcu_paras.gvcpassword;
                            isCreater = true;

                            app_callbacks.cb_room({
                                result: 'OK',
                                info: "创建成功",
                                roomId: res.callId,
                                roomPasswd: mcu_paras.gvcpassword,
                                reqType: options.reqType
                            });
                        }
                        else
                            app_callbacks.cb_room({result: 'FAIL', info: res.reason, reqType: options.reqType});
                    }

                }
            }
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Authorization", "RTCAUTH,realm=AppClient,AppAccountID=" + cfg_account.rtcacc + ",Token=" + cfg_account.password);
            xhr.send(JSON.stringify(mcu_paras));
        }
        //add by henry
        function mcu_record(options){
            var mcu_paras = {};
            var xhr = new XMLHttpRequest();
            xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/CallID/"+roomInfo.roomId+"/RecordConf", true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (app_callbacks.cb_room) {
                        if (res.code == "200" || res.code == "0") {
                            console.log("111111111111111111111111111+succeed");
                            //add by chm 20150608: the creater
                            /*curRoom = res.callId;
                            roomInfo.roomId = res.callId;
                            roomInfo.roomPasswd = mcu_paras.gvcpassword;
                            isCreater = true;

                            app_callbacks.cb_room({
                                result: 'OK',
                                info: "创建成功",
                                roomId: res.callId,
                                roomPasswd: mcu_paras.gvcpassword,
                                reqType: options.reqType
                            });*/
                        }
                        else
                            app_callbacks.cb_room({result: 'FAIL', info: res.reason, reqType: options.reqType});
                    }

                }
            }
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Authorization", "RTCAUTH,realm=AppClient,AppAccountID=" + cfg_account.rtcacc + ",Token=" + cfg_account.password);
            xhr.send(JSON.stringify(mcu_paras));
        }
        function mcu_queryrooms(options) {
            var xhr = new XMLHttpRequest();

            xhr.open('GET', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/CallID/12345/MemberManagement/QueryGVCList", true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }

                    if (app_callbacks.cb_room) {
                        if (res.code == "200" || res.code == "0") {
                            var rooms = new Array();
                            for (var i = 0; i < res.gvcList.length; i++) {
                                rooms.push({
                                    name: res.gvcList[i].gvcname,
                                    roomId: res.gvcList[i].callId,
                                    ifNeedPwd: res.gvcList[i].gvcattendingPolicy
                                });
                            }
                            app_callbacks.cb_room({result: 'OK', info: rooms, reqType: options.reqType});
                        }
                        else
                            app_callbacks.cb_room({result: 'FAIL', info: res.reason, reqType: options.reqType});

                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Authorization", "RTCAUTH,realm=AppClient,AppAccountID=" + cfg_account.rtcacc + ",Token=" + cfg_account.password);
            xhr.send();
        }

        function mcu_joinroom(options) {
            var xhr = new XMLHttpRequest();
            //modified by chm 20150608:terminal type Browser to Any
            var mcu_paras = {
                invitedmemberlist: [{appAccountID: cfg_account.rtcacc_notermtype + "~Any"}],
                mode: 10,
                gvcpassword: options.passwd
            };

            xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/CallID/" + options.roomId + "/MemberManagement/ApplyToJoin", true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (app_callbacks.cb_room) {
                        if (res.code == "200" || res.code == "0") {
                            app_callbacks.cb_room({
                                result: 'OK',
                                info: "加入room成功",
                                reqType: options.reqType,
                                roomId: options.roomId
                            });
                        }
                        else
                            app_callbacks.cb_room({
                                result: 'FAIL',
                                info: res.reason,
                                reqType: options.reqType,
                                roomId: options.roomId
                            });
                    }
                }
            }

            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Authorization", "RTCAUTH,realm=AppClient,AppAccountID=" + cfg_account.rtcacc + ",Token=" + cfg_account.password);
            xhr.send(JSON.stringify(mcu_paras));
        }

        function mcu_addmember(options) {
            var xhr = new XMLHttpRequest();

            var mcu_paras = {invitedmemberlist: cfg_account.rtcacc, mode: 10};

            var members = new Array();
            //modified by chm 20150409
            var mems = options.roomMembers.split(',');
            for (var i = 0; i < mems.length; i++) {
                members.push({"appAccountID": (cfg_account.accType + "-" + mems[i] + "~" + cfg_account.appid + "~Any" )});
            }
            mcu_paras.invitedmemberlist = members;
            //modified by chm 20150608:options.roomId to roomInfo
            if (isCreater)
                xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/CallID/" + roomInfo.roomId + "/MemberManagement/InviteMember", true);
            else
                xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc_notermtype + "/CallID/" + roomInfo.roomId + "/MemberManagement/InviteMember", true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (app_callbacks.cb_room) {
                        if (res.code == "200" || res.code == "0") {
                            app_callbacks.cb_room({
                                result: 'OK',
                                info: "增加成功",
                                reqType: options.reqType,
                                roomId: options.roomId
                            });
                        }
                        else
                            app_callbacks.cb_room({
                                result: 'FAIL',
                                info: res.reason,
                                reqType: options.reqType,
                                roomId: options.roomId
                            });
                    }
                }
            }

            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Authorization", "RTCAUTH,realm=AppClient,AppAccountID=" + cfg_account.rtcacc + ",Token=" + cfg_account.password);
            xhr.send(JSON.stringify(mcu_paras));
        }

        function mcu_querymembers(options) {
            var xhr = new XMLHttpRequest();
            //modified by chm 20150608
            if (isCreater) {
                xhr.open('GET', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/CallID/" + roomInfo.roomId + "/MemberManagement/GetMemberlist", true);
            }
            else {
                xhr.open('GET', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc_notermtype + "/CallID/" + roomInfo.roomId + "/MemberManagement/GetMemberlist", true);
            }

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (app_callbacks.cb_room) {
                        if (res.code == "200" || res.code == "0") {
                            var rooms = new Array();
                            for (var i = 0; i < res.memberInfoList.length; i++) {
                                if (res.memberInfoList[i].role === 1) {
                                    var loc1 = res.memberInfoList[i].appAccountID.indexOf('-');
                                    var loc2 = res.memberInfoList[i].appAccountID.indexOf('~');
                                    roomInfo.creater = res.memberInfoList[i].appAccountID.substring(loc1 + 1, loc2);
                                    roomInfo.createrFull = res.memberInfoList[i].appAccountID;
                                }
                                rooms.push({
                                    name: res.memberInfoList[i].appAccountID,
                                    state: res.memberInfoList[i].memberStatus
                                });
                            }
                            if (options.reqType !== "noCallBack")
                                app_callbacks.cb_room({result: 'OK', info: rooms, reqType: options.reqType});
                        }
                        else
                            app_callbacks.cb_room({result: 'FAIL', info: res.reason, reqType: options.reqType});
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Authorization", "RTCAUTH,realm=AppClient,AppAccountID=" + cfg_account.rtcacc + ",Token=" + cfg_account.password);
            xhr.send();
        }

        function mcu_controlmember(options) {
            var xhr = new XMLHttpRequest();

            var mcu_paras = {memberOperationList: cfg_account.rtcacc};

            var membersControl = new Array();
            //modified by chm 20150409
            var mems = options.controlMembers.split(',');
            for (var i = 0; i < mems.length; i++) {
                var mem;
                if (roomInfo.creater == mems[i])
                    mem = roomInfo.createrFull;
                else
                    mem = cfg_account.accType + "-" + mems[i] + "~" + cfg_account.appid;

                membersControl.push({
                    "member": mem,
                    "upStreamOperationType": parseInt(options.upStrm),
                    "downStreamOperationType": parseInt(options.downStrm)
                });
            }
            mcu_paras.memberOperationList = membersControl;
            //modified by chm 20150608:options.roomId to roomInfo
            if (isCreater)
                xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/CallID/" + roomInfo.roomId + "/AVStreamManagement", true);
            else
                xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc_notermtype + "/CallID/" + roomInfo.roomId + "/AVStreamManagement", true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (app_callbacks.cb_room) {
                        if (res.code == "200" || res.code == "0") {
                            app_callbacks.cb_room({
                                result: 'OK',
                                info: "控制成功",
                                reqType: options.reqType,
                                roomId: options.roomId
                            });
                        }
                        else
                            app_callbacks.cb_room({
                                result: 'FAIL',
                                info: res.reason,
                                reqType: options.reqType,
                                roomId: options.roomId
                            });
                    }
                }
            }

            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Authorization", "RTCAUTH,realm=AppClient,AppAccountID=" + cfg_account.rtcacc + ",Token=" + cfg_account.password);
            xhr.send(JSON.stringify(mcu_paras));
        }

        //add by chm 20150608
        function mcu_quitroom(options) {
            var xhr = new XMLHttpRequest();

            var mcu_paras = {kickedMemberList: [{appAccountID: options.kickMembers}]};

            if (isCreater)
                xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/CallID/" + roomInfo.roomId + "/MemberManagement/Quit", true);
            else
                xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc_notermtype + "/CallID/" + roomInfo.roomId + "/MemberManagement/Quit", true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (app_callbacks.cb_room) {
                        if (res.code == "200" || res.code == "0") {
                            app_callbacks.cb_room({
                                result: 'OK',
                                info: "加入room成功",
                                reqType: options.reqType,
                                roomId: options.roomId
                            });
                        }
                        else
                            app_callbacks.cb_room({
                                result: 'FAIL',
                                info: res.reason,
                                reqType: options.reqType,
                                roomId: options.roomId
                            });
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Authorization", "RTCAUTH,realm=AppClient,AppAccountID=" + cfg_account.rtcacc + ",Token=" + cfg_account.password);
            xhr.send(JSON.stringify(mcu_paras));
        }

        function mcu_destroyroom(options) {
            var xhr = new XMLHttpRequest();

            if (isCreater)
                xhr.open('DELETE', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/CallID/" + roomInfo.roomId + "/GroupCall", true);
            else
                xhr.open('DELETE', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc_notermtype + "/CallID/" + roomInfo.roomId + "/GroupCall", true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }

                    if (app_callbacks.cb_room) {
                        if (res.code == "200" || res.code == "0")
                            app_callbacks.cb_room({result: 'OK', info: '销毁成功', reqType: options.reqType});
                        else
                            app_callbacks.cb_room({result: 'FAIL', info: res.reason, reqType: options.reqType});
                    }
                }
            }

            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Authorization", "RTCAUTH,realm=AppClient,AppAccountID=" + cfg_account.rtcacc + ",Token=" + cfg_account.password);
            xhr.send();
        }

        function mcu_makeroomurl(options) {
            //modified by chm 20150601
            var roomURL = "";
            var roomHref = location.toString();
            var pn = location.pathname;
            var last = pn.lastIndexOf('/');
            pn = pn.substring(last + 1);
            var temp = roomHref.indexOf('?');
            last = roomHref.indexOf('#');
            if (last !== -1) {
                if (temp !== -1)
                    roomURL = roomHref.substring(0, temp);
                else
                    roomURL = roomHref.substring(0, last);
            }
            else if (temp !== -1) {
                roomURL = roomHref.substring(0, temp);
            } else {
                roomURL = roomHref;
            }
            //modified by chm 20150608
            roomHref = Ctrtc.Base64.encode(roomInfo.roomId);
            roomURL = roomURL + "?roomId=" + roomHref;
            roomURL = roomURL.replace(pn, 'meetme.php');

            //modified by chm 20150623
            if (roomInfo.roomPasswd !== '') {
                roomHref = Ctrtc.Base64.encode(roomInfo.roomPasswd);
                roomURL = roomURL + "&passwd=" + roomHref;
            } else {
                var result = prompt("请输入这个房间的密码。(没有密码请直接点击确定)", "");
                if (result !== null) {//如果用户没有点击取消
                    if (result == "")//如果用户选择没有密码则使用默认密码"ctbri"
                        result = "ctbri";
                    roomHref = Ctrtc.Base64.encode(result);
                    roomURL = roomURL + "&passwd=" + roomHref;
                }
            }
            /*if(options.roomPasswd){
             roomHref = Ctrtc.Base64.encode(options.roomPasswd);
             roomURL = roomURL + "&passwd=" + roomHref;
             }*/

            if (app_callbacks.cb_room) {
                app_callbacks.cb_room({
                    result: 'OK',
                    info: '成功',
                    reqType: options.reqType,
                    roomId: roomInfo.roomId,
                    roomURL: roomURL
                });
            }
        }

        function mcu_joinroombyurl(options) {
            var roomId = getURLParameterByName("roomId");
            var passwd = getURLParameterByName("passwd");
            //add by chm 20150608
            roomId = Ctrtc.Base64.decode(roomId);
            passwd = Ctrtc.Base64.decode(passwd);

            mcu_joinroom({reqType: options.reqType, roomId: roomId, passwd: passwd});
        }

        //add by chm 20150628
        function mcu_resetScreen(options) {
            var xhr = new XMLHttpRequest();
            var mcu_paras = {};

            if (options.screenSplit) {
                mcu_paras.screenSplit = parseInt(options.screenSplit);
            }

            if (options.setLV) {
                mcu_paras.lv = parseInt(options.setLV);
            }

            if (options.resetMembers) {
                var members = new Array();
                var mems = options.resetMembers.split(',');
                for (var i = 0; i < mems.length; i++) {
                    if (mems[i] === roomInfo.creater) {
                        members.push({"appAccountID": roomInfo.createrFull});
                    }
                    else
                        members.push({"appAccountID": (cfg_account.accType + "-" + mems[i] + "~" + cfg_account.appid + "~Any")});
                }
                mcu_paras.memberList = members;
            }

            if (options.setMember && options.setMode) {
                if (options.setMember === roomInfo.creater) {
                    mcu_paras.memberToSet = roomInfo.createrFull;
                    mcu_paras.memberSetStyle = parseInt(options.setMode);
                } else {
                    mcu_paras.memberToSet = cfg_account.accType + "-" + options.setMember + "~" + cfg_account.appid + "~Any";
                    mcu_paras.memberSetStyle = parseInt(options.setMode);
                }
            }

            if (options.setMode === '4' && options.replaceMember) {
                if (options.replaceMember === roomInfo.creater) {
                    mcu_paras.memberToShow = roomInfo.createrFull;
                } else
                    mcu_paras.memberToShow = cfg_account.accType + "-" + options.replaceMember + "~" + cfg_account.appid + "~Any";
            }

            if (isCreater)
                xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc + "/CallID/" + roomInfo.roomId + "/VideoDisplayManagement", true);
            else
                xhr.open('POST', cfg_account.restSvrAddr + "/RTC/ws/1.0/ApplicationID/" + cfg_account.appid + "/AppAccountID/" + cfg_account.rtcacc_notermtype + "/CallID/" + roomInfo.roomId + "/VideoDisplayManagement", true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (app_callbacks.cb_room) {
                        if (res.code == "200" || res.code == "0") {
                            app_callbacks.cb_room({
                                result: 'OK',
                                info: "设置成功",
                                reqType: "resetScreen",
                                roomId: roomInfo.roomId
                            });
                        } else
                            app_callbacks.cb_room({
                                result: 'FAIL',
                                info: res.reason,
                                reqType: "resetScreen",
                                roomId: roomInfo.roomId
                            });
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Authorization", "RTCAUTH,realm=AppClient,AppAccountID=" + cfg_account.rtcacc + ",Token=" + cfg_account.password);
            xhr.send(JSON.stringify(mcu_paras));
        }

        function getURLParameterByName(name) {
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(location.search);
            return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }

        return {
            init: function (token, option) {
                level = 'NORMAL';
                var authinfo = Ctrtc.Base64.decode(token);
                var a_authinfo = authinfo.split('|');
                //add by chm 20150525 to tell the wrong token
                if (a_authinfo.length > 6 && a_authinfo[6] !== '1') {
                    return a_authinfo[0];
                }
                cfg_account = {
                    appid: a_authinfo[3],
                    appacc: a_authinfo[1],
                    accType: a_authinfo[2],
                    password: a_authinfo[0],
                    terminalSN: a_authinfo[4],
                    terminalType: a_authinfo[5],
                    serverAddrSvr: 'https://test1.chinartc.com:8449'
                };
                cfg_account.rtcacc_notermtype = cfg_account.accType + "-" + cfg_account.appacc + "~" + cfg_account.appid;
                cfg_account.rtcacc = cfg_account.rtcacc_notermtype + "~" + cfg_account.terminalType;
                cfg_jssip.uri = cfg_account.rtcacc + "@chinartc.com";
                cfg_jssip.password = cfg_account.password;
                cfg_jssip.terminalSN = cfg_account.terminalSN;

                if (option && option.dbg) {
                    cfg_jssip.trace_sip = true;
                }
                //modified by chm 20150505
                if (option && option.defaultPhone) {
                    cfg_account.defaultResolution = 'cif';
                }
                if (option && option.serverAddrSvr) {
                    cfg_account.serverAddrSvr = option.serverAddrSvr;
                }
                if (option && option.videoSelectId) {
                    videoSelect = document.getElementById(option.videoSelectId);
                }
                if (option && option.audioSelectId) {
                    audioSelect = document.getElementById(option.audioSelectId);
                }
                if (typeof MediaStreamTrack === 'undefined') {
                    console.log('This browser does not support MediaStreamTrack.\n\nTry Chrome Canary.');
                } else if (option.videoSelectId || option.audioSelectId) {
                    MediaStreamTrack.getSources(gotSources);
                }

                soundPlayer = document.createElement("audio");
                soundPlayer.loop = true;

                try {
                    getServerInfo();
                } catch (e) {
                    return;
                }
                //20150601 add by chm to adapt wrong token
                if (a_authinfo.length > 6)
                    return false;
            },

            run: function () {
                if (JsSIP.WebRTC.isSupported == false) {
                    if (app_callbacks.cb_deverr) {
                        app_callbacks.cb_deverr({info: 'browserNotSupported'});
                    }
                    return;
                }

                if (UA) {
                    UA.on('registered', stackEvent);
                    UA.on('disconnected', stackEvent);
                    UA.on('newRTCSession', stackEvent);
                    UA.on('connected', stackEvent);
                    UA.on('disconnected', stackEvent);
                    UA.on('notifyKickby', stackEvent);
                    UA.on('notifyRoom', stackEvent);
                    //add by chm 20150422
                    UA.on('registrationFailed', stackEvent);
                    //add by chm 20150525
                    UA.on('newMessage', stackEvent);
                    //UA.on('failed',stackEvent);//zzc 底层没有回调ua.emit("failed",...)
                    UA.start();
                }
            },

            //add by chm 20150525
            sendUserMessage: function (callee, message, terminalType) {
                var finalType = terminalType || "Any";
                //var encode_callee = Ctrtc.MD5.encode(callee);
                var callee_uri = cfg_account.accType + "-" + callee + "~" + cfg_account.appid + "~" + finalType + "@chinartc.com";
                UA.sendMessage(callee_uri, message);
            },

            setUpdateTime: function (value) {
                UA.setSE(value);
            },

            recordLocal: function (type) {
                UA.startRecordLocal(type);
            },

            stopRecordLocal: function (fun_app_cb) {
                UA.stopRecordLocal();
                app_callbacks.cb_recordlocalstopped = fun_app_cb;
            },

            recordRemote: function (type) {
                UA.startRecordRemote(type);
            },

            stopRecordRemote: function (fun_app_cb) {
                UA.stopRecordRemote();
                app_callbacks.cb_recordremotestopped = fun_app_cb;
            },

            setPath: function (path) {
                soundPlayer.setAttribute('src', path);
                alert('Set music success!');
            },

            getRoomInfo: function () {
                return roomInfo;
            },

            screenCapture: function (remoteID, captrueID) {
                var video = document.getElementById(remoteID);
                var videoWidth = video.videoWidth, videoHeight = video.videoHeight;
                if (videoWidth && videoHeight) {
                    var canvas;
                    if (captrueID)
                        canvas = document.getElementById(captrueID);
                    else
                        canvas = document.createElement('canvas');
                    canvas.width = videoWidth;
                    canvas.height = videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0, videoWidth, videoHeight);
                    //var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                    //window.location.href = image + '.png';
                    //add for capture
                    var type = 'png';
                    var imgData = canvas.toDataURL(type);
                    var _fixType = function (type) {
                        type = type.toLowerCase().replace(/jpg/i, 'jpeg');
                        var r = type.match(/png|jpeg|bmp|gif/)[0];
                        return 'image/' + r;
                    };
                    imgData = imgData.replace(_fixType(type), 'image/octet-stream');

                    var saveFile = function (data, filename) {
                        var save_link = document.createElement('a');
                        save_link.href = data;
                        save_link.download = filename;

                        var event = document.createEvent('MouseEvents');
                        event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                        save_link.dispatchEvent(event);
                        $(save_link).click();
                    };

                    // 下载后的问题名
                    var filename = '视频截图' + (new Date()).getTime() + '.' + type;
                    // download
                    saveFile(imgData, filename);
                } else {
                    console.warn("Failed to get the remote video!");
                }
            },

            connect: function (callee, options) {
                var callee_uri, mediaType;
                if (typeof callee == "string") {
                    if (callee == "#MCU.CHINARTC") {
                        if (options.reqType == "queryRooms")
                            return mcu_queryrooms(options);

                        if (options.reqType == "createRoom")
                            return mcu_createroom(options);

                        if (options.reqType == "joinRoom")
                            return mcu_joinroom(options);

                        if (options.reqType == "addMember")
                            return mcu_addmember(options);

                        if (options.reqType == "controlMember")
                            return mcu_controlmember(options);

                        if (options.reqType == "destroyRoom")
                            return mcu_destroyroom(options);

                        if (options.reqType == "roomURL")
                            return mcu_makeroomurl(options);

                        if (options.reqType == "joinRoomByURL")
                            return mcu_joinroombyurl(options);

                        if (options.reqType === "queryMembers") {
                            //options.isShow = true;
                            return mcu_querymembers(options);
                        }

                        if (options.reqType === "quitRoom")
                            return mcu_quitroom(options);

                        if (options.reqType === "resetScreen") {
                            return mcu_resetScreen(options);
                        }
                        if (options.reqType === "recordh"){
                            return mcu_record(options);
                        }
                    }

                    var accType = cfg_account.accType;
                    if (options && options.accType) {
                        if (options.accType == "inner")
                            accType = '10';
                        if (options.accType == "esurf")
                            accType = '11';
                        if (options.accType == "weibo")
                            accType = '12';
                        if (options.accType == "qq")
                            accType = '13';
                    }

                    var calleeTerminalType = "Any";
                    if (options && options.terminalType) {
                        calleeTerminalType = options.terminalType;
                    }

                    var calleeAppId = cfg_account.appid;
                    if (options && options.appId) {
                        calleeAppId = options.appId;
                    }

                    //add by chm 20151125 to adapt the multi character username
                    var encode_callee = Ctrtc.Method.encode_char(callee);
                    callee_uri = accType + "-" + encode_callee + "~" + calleeAppId + "~" + calleeTerminalType + "@chinartc.com";
                } else {
                    return {error_info: "badparameter"};
                }

                mediaType = {audio: true, video: true, screen: false, direction: 'sendrecv'};

                if (options && options.mediaType) {
                    if (options.mediaType === "screen") {
                        mediaType.screen = true;
                    }
                    else if (options.mediaType == "audio") {
                        mediaType.video = false;
                        if (audioSelect) {
                            mediaType.audio = {
                                optional: [{
                                    sourceId: audioSelect.value
                                }]
                            };
                        }
                    }
                    else {
                        var videoR = null;
                        if (options.videoResolution)
                            videoR = options.videoResolution;
                        else if (cfg_account.defaultResolution)
                            videoR = cfg_account.defaultResolution;
                        if (videoR) {
                            if (videoR == "qvga")
                                mediaType.video = {
                                    mandatory: {
                                        maxWidth: 320,
                                        maxHeight: 180
                                    }
                                };

                            if (videoR == "vga")
                                mediaType.video = {
                                    mandatory: {
                                        maxWidth: 640,
                                        maxHeight: 360
                                    }
                                };

                            if (videoR == "hd")
                                mediaType.video = {
                                    mandatory: {
                                        maxWidth: 1280,
                                        maxHeight: 720
                                    }
                                };

                            if (videoR == "cif")
                                mediaType.video = {
                                    mandatory: {
                                        maxWidth: 352,
                                        maxHeight: 288
                                    }
                                };

                            if (videoSelect) {
                                mediaType.video = {
                                    mandatory: mediaType.video.mandatory,
                                    optional: [{
                                        sourceId: audioSelect.value
                                    }]
                                };
                            }
                        } else {
                            if (videoSelect) {
                                mediaType.video = {
                                    optional: [{
                                        sourceId: videoSelect.value
                                    }]
                                };
                            }
                        }
                        if (options.mediaType == "recvonly" || options.mediaType == "sendonly")
                            mediaType.direction = options.mediaType;
                    }
                }

                //add by chm 20150601
                mediaType.audio = {
                    mandatory: {
                        googEchoCancellation: true, // disabling audio processing
                        googAutoGainControl: false,
                        googNoiseSuppression: true,
                        googHighpassFilter: true,
                        googTypingNoiseDetection: true
                    }
                };
                if (options.setEC) {
                    var ec = parseInt(options.setEC);
                    if (ec === 1) {
                        mediaType.audio.mandatory.googEchoCancellation = true;
                    }
                    else
                        mediaType.audio.mandatory.googEchoCancellation = false;
                }
                if (options.setAGC) {
                    var agc = parseInt(options.setAGC);
                    if (agc === 1) {
                        mediaType.audio.mandatory.googAutoGainControl = false;
                    }
                    else
                        mediaType.audio.mandatory.googAutoGainControl = true;
                }
                //add extraParas by chm 20150409
                UA.call(callee_uri, {
                    mediaConstraints: mediaType,
                    extraParas: options.extraInfo,
                    RTCConstraints: {"optional": [{'DtlsSrtpKeyAgreement': 'false'}]}
                });
            },

            disconnectAll: function (options) {
                var sessions = UA.sessions;
                for (var index in sessions) {
                    sessions[index].terminate(options);
                }
                //add by chm 20150608
                if (options && options.unNormal) {
                    UA.transport.disconnect();
                }
            },

            onReady: function (fun_app_cb) {
                app_callbacks.cb_ready = fun_app_cb;
            },

            onConnNew: function (fun_app_cb) {
                app_callbacks.cb_connnew = fun_app_cb;
            },

            onRinging: function (fun_app_cb) {
                app_callbacks.cb_ring = fun_app_cb;
            },

            onStarted: function (fun_app_cb) {
                app_callbacks.cb_started = fun_app_cb;
            },

            onEnded: function (fun_app_cb) {
                app_callbacks.cb_ended = fun_app_cb;
            },

            onConnFailed: function (fun_app_cb) {
                app_callbacks.cb_connfailed = fun_app_cb;
            },

            onDevErr: function (fun_app_cb) {
                app_callbacks.cb_deverr = fun_app_cb;
            },
            onStats: function (fun_app_cb) {
                app_callbacks.cb_stats = fun_app_cb;
            },

            onRoomEvent: function (fun_app_cb) {
                app_callbacks.cb_room = fun_app_cb;
            },

            onReceiveMessage: function (fun_app_cb) {
                app_callbacks.cb_message = fun_app_cb;
            },

            setDebug: function () {
                level = 'DEBUG';
            }
        }
    }();

    Ctrtc.Device = device;

    (function (Ctrtc) {
        var Connection;

        Connection = function (e, app_callbacks, cfg_account) {
            this.app_callbacks = app_callbacks;
            this.session = e.data.session;
            this.direction = this.session.direction;
            this.status = "newconn";
            this.statsSignal = {bStop: false};
            this.extraParas = "";
            this.cfg_account = cfg_account;

            this.localRecorder = null;
            this.remoteRecorder = null;

            //add by chm 20150409
            var req = e.data.request.toString();
            var tmp = req.indexOf('Call-Info');
            if (tmp != -1) {
                req = req.substring(tmp);
                tmp = req.indexOf('\r\n');
                if (tmp != -1) {
                    this.extraParas = req.substring(11, tmp);
                }
            }

            if (this.direction == "incoming") {
                if (this.session.isMcu) {
                    this.remoteMedia = this.session.roomInfo.remoteMedia;
                } else {
                    var sdp = e.data.request.body;
                    if (sdp.indexOf("recvonly") != -1)
                        this.remoteMedia = "recvonly";
                    else if (sdp.indexOf("sendonly") != -1)
                        this.remoteMedia = "sendonly";
                    else if (e.data.request.body.indexOf("video") != -1)
                        this.remoteMedia = "video";
                    else
                        this.remoteMedia = "audio";
                }
            }

            if (this.session.isMcu) {
                this.remoteAccount = {
                    username: this.session.roomInfo.gvcname,
                    roomId: this.session.roomInfo.gvcid,
                    mcuType: this.session.roomInfo.gvctype_cn,
                    isMcu: true
                };
                if (!Ctrtc.Device.rooms)Ctrtc.Device.rooms = new Array();
                Ctrtc.Device.rooms.push({roomId: this.remoteAccount.roomId, roomName: this.remoteAccount.username});
            } else {
                var acc_arr = this.session.remote_identity.uri.user.split('~');//"10-ww~123~Browser"
                var acc_arr_1 = acc_arr[0].split('-');
                this.remoteAccount = {
                    type: acc_arr_1[0],
                    username: acc_arr_1[1],
                    appid: acc_arr[1],
                    terminal: acc_arr[2]
                };
            }
        };

        Connection.prototype = {
            accept: function (options) {
                var mediaType = {audio: true, video: true, screen: false};
                if (options && options.mediaType) {
                    //add by chm 20151221 to adapt screen share
                    if (options.mediaType === "screen") {
                        mediaType.screen = true;
                    } else if (options.mediaType === "multiscreen") {
                        mediaType = {audio: true, video: true, screen: true, multi: true}
                    } else if (options.mediaType == "audio")
                        mediaType.video = false;
                }

                if (mediaType.video == true) {
                    var videoR = null;
                    if (options && options.videoResolution)
                        videoR = options.videoResolution;
                    else if (this.cfg_account.defaultResolution)
                        videoR = this.cfg_account.defaultResolution;


                    if (videoR) {
                        if (videoR == "qvga")
                            mediaType.video = {
                                mandatory: {
                                    maxWidth: 320,
                                    maxHeight: 180
                                }
                            };

                        if (videoR == "vga")
                            mediaType.video = {
                                mandatory: {
                                    maxWidth: 640,
                                    maxHeight: 360
                                }
                            };

                        if (videoR == "hd")
                            mediaType.video = {
                                mandatory: {
                                    maxWidth: 1280,
                                    maxHeight: 720
                                }
                            };

                        if (videoR == "cif")
                            mediaType.video = {
                                mandatory: {
                                    maxWidth: 352,
                                    maxHeight: 288
                                }
                            };

                    }
                }
                //add by chm 20150601
                mediaType.audio = {
                    mandatory: {
                        googEchoCancellation: true, // disabling audio processing
                        googAutoGainControl: false,
                        googNoiseSuppression: true,
                        googHighpassFilter: true,
                        googTypingNoiseDetection: true
                    }
                };
                if (options.setEC) {
                    var ec = parseInt(options.setEC);
                    if (ec === 1) {
                        mediaType.audio.mandatory.googEchoCancellation = true;
                    }
                    else
                        mediaType.audio.mandatory.googEchoCancellation = false;
                }
                if (options.setAGC) {
                    var agc = parseInt(options.setAGC);
                    if (agc === 1) {
                        mediaType.audio.mandatory.googAutoGainControl = false;
                    }
                    else
                        mediaType.audio.mandatory.googAutoGainControl = true;
                }
                this.session.answer({mediaConstraints: mediaType});
            },
            terminate: function () {
                this.session.terminate();
            },
            stop: function () {
                this.session.getLocalStreams()[0].getAudioTracks()[0].enabled = false;
                this.session.getLocalStreams()[0].getVideoTracks()[0].enabled = false;
            },
            resume: function () {
                this.session.getLocalStreams()[0].getAudioTracks()[0].enabled = true;
                this.session.getLocalStreams()[0].getVideoTracks()[0].enabled = true;
            },

            regCallback: function (app_callbacks, conn, player) {

                this.session.on('startRecordLocal', function (e) {
                    console.log('zzc:startRecordLocal ' + e.data.type);
                    var stream = conn.session.getLocalStreams()[0];
                    if (e.data.type == 'av')
                        this.localRecorder = RecordRTC(stream, {type: 'video'});
                    else
                        this.localRecorder = RecordRTC(stream, {type: 'audio'});
                    this.localRecorder.startRecording();
                });

                this.session.on('endRecordLocal', function (e) {
                    var self = this;
                    if (this.localRecorder) {
                        this.localRecorder.stopRecording(function (url) {
                            app_callbacks.cb_recordlocalstopped(url);
                            console.log('zzc:endRecordLocal ' + url);
                        });
                    }
                });

                this.session.on('startRecordRemote', function (e) {
                    console.log('zzc:startRecordRemote ' + e.data.type);
                    var stream = conn.session.getRemoteStreams()[0];
                    if (e.data.type == 'av')
                        this.remoteRecorder = RecordRTC(stream, {type: 'video'});
                    else
                        this.remoteRecorder = RecordRTC(stream, {type: 'audio'});
                    this.remoteRecorder.startRecording();
                    /*recordVideo = RecordRTC(stream, {
                     type: 'video'
                     });
                     recordAudio = RecordRTC(stream,{
                     onAudioProcessStarted:function(){
                     recordVideo.startRecording();
                     }
                     });
                     recordAudio.startRecording();*/
                });

                this.session.on('endRecordRemote', function (e) {
                    var self = this;
                    /*this.recordAudio.stopRecording(function(audioUrl){
                     self.recordVideo.stopRecording(function(videoUrl){
                     var audio = document.getElementsByTagName('video')[0];
                     var video = document.getElementsByTagName('video')[1];
                     audio.src = audioUrl;
                     audio.play();
                     video.src = videoUrl;
                     video.play();
                     });
                     });*/
                    if (this.remoteRecorder) {
                        this.remoteRecorder.stopRecording(function (url) {
                            app_callbacks.cb_recordremotestopped(url);
                            console.log('zzc:endRecordRemote ' + url);//self.recorder.save();
                            //download it to computer
                            /*var obj_target = document.createElement('a');
                             if (obj_target){
                             obj_target.href = url;
                             obj_target.download = '1.WebM';	 
                             var event = document.createEvent('MouseEvents');
                             event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                             obj_target.dispatchEvent(event);
                             //$(obj_target).click();
                             }*/
                        });
                    }
                });

                this.session.on('failed', function (e) {
                    conn.statsSignal.bStop = true;
                    if (player) {
                        player.pause();
                    }
                    if (e.data.originator == "remote" && e.data.cause == "Unavailable") {///通话中一方关闭网页			
                        conn.status = 'ended';
                        conn.info = 'remote no response';
                        app_callbacks.cb_ended(conn);
                        return;
                    }

                    conn.status = 'error';
                    conn.info = e.data.cause;
                    app_callbacks.cb_connfailed(conn);

                });


                this.session.on('progress', function (e) {
                    if (e.data.originator === 'remote') {
                        if (player) {
                            if (player.src === null || player.src === '') {
                                player.setAttribute("src", "http://42.123.77.112:8099/2.1.0/sounds/outgoing-call2.ogg");
                            }
                            player.play();
                        }

                        conn.status = 'ringing';
                        conn.info = '';
                        app_callbacks.cb_ring(conn);
                    }
                });


                this.session.on('started', function (e) {

                    if (player) {
                        player.pause();
                    }
                    conn.status = 'started';
                    conn.info = '';
                    conn.localStream = null;
                    conn.remoteStream = null;
                    if (conn.session.getLocalStreams().length > 0) {
                        conn.localStream = conn.session.getLocalStreams()[0];
                    }
                    console.log(conn.session.getRemoteStreams());
                    if (conn.session.getRemoteStreams().length > 0) {
                        conn.remoteStream = conn.session.getRemoteStreams()[0];
                    }
                    app_callbacks.cb_started(conn);

                    if (app_callbacks.cb_stats) {
                        conn.statsSignal.bStop = false;
                        getStats(conn.session.rtcMediaHandler.peerConnection,
                            function (result) {

                                if (result.connectionType)
                                    app_callbacks.cb_stats(conn, result);

                                //console.log(result.audio);

                                //console.log(result.audio.availableBandwidth);
                                //console.log(result.audio.packetsSent);
                                //console.log(result.audio.packetsLost);
                                //console.log(result.audio.rtt);

                                // to access native "results" array
                                //result.results.forEach(function(r) {
                                //    console.log(r);
                                //});
                                if (conn.statsSignal.bStop)
                                    result.nomore();

                            },
                            2000);
                    }

                });

                this.session.on('ended', function (e) {
                    conn.status = 'ended';
                    conn.info = 'user closed';
                    app_callbacks.cb_ended(conn);
                    conn.statsSignal.bStop = true;
                });

                if (conn.direction == 'incoming' && player) {
                    //modified by chm 20150601
                    if (player.src === '' || player.src === null) {
                        player.setAttribute("src", "http://42.123.77.112:8099/2.1.0/sounds/incoming-call2.ogg");
                    }
                    player.play();
                }

                app_callbacks.cb_connnew(conn);

            }
        };

        Ctrtc.Connection = Connection;

    }(Ctrtc));

//Ctrtc 用到的一些方法
    (function (global) {
        function encode_char(str) {
            var result = str.replace(/@/g, "~");
            return result;
        }

        function decode_char(str, flag) {
            var location = str.lastIndexOf(flag);
            var subStr = str.substring(0, location - 1);
            var result = subStr.replace(/~/g, "@");
            return result;
        }

        global.Method = {
            encode_char: encode_char,
            decode_char: decode_char
        };
    })(Ctrtc);

//用 JS 实现 base64 加密 & 解密。
    (function (global) {
        'use strict';
        // existing version for noConflict()
        var _Base64 = global.Base64;
        var version = "2.1.5";
        // if node.js, we use Buffer
        var buffer;
        if (typeof module !== 'undefined' && module.exports) {
            buffer = require('buffer').Buffer;
        }
        // constants
        var b64chars
            = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        var b64tab = function (bin) {
            var t = {};
            for (var i = 0, l = bin.length; i < l; i++) t[bin.charAt(i)] = i;
            return t;
        }(b64chars);
        var fromCharCode = String.fromCharCode;
        // encoder stuff
        var cb_utob = function (c) {
            if (c.length < 2) {
                var cc = c.charCodeAt(0);
                return cc < 0x80 ? c
                    : cc < 0x800 ? (fromCharCode(0xc0 | (cc >>> 6))
                + fromCharCode(0x80 | (cc & 0x3f)))
                    : (fromCharCode(0xe0 | ((cc >>> 12) & 0x0f))
                + fromCharCode(0x80 | ((cc >>> 6) & 0x3f))
                + fromCharCode(0x80 | ( cc & 0x3f)));
            } else {
                var cc = 0x10000
                    + (c.charCodeAt(0) - 0xD800) * 0x400
                    + (c.charCodeAt(1) - 0xDC00);
                return (fromCharCode(0xf0 | ((cc >>> 18) & 0x07))
                + fromCharCode(0x80 | ((cc >>> 12) & 0x3f))
                + fromCharCode(0x80 | ((cc >>> 6) & 0x3f))
                + fromCharCode(0x80 | ( cc & 0x3f)));
            }
        };
        var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
        var utob = function (u) {
            return u.replace(re_utob, cb_utob);
        };
        var cb_encode = function (ccc) {
            var padlen = [0, 2, 1][ccc.length % 3],
                ord = ccc.charCodeAt(0) << 16
                    | ((ccc.length > 1 ? ccc.charCodeAt(1) : 0) << 8)
                    | ((ccc.length > 2 ? ccc.charCodeAt(2) : 0)),
                chars = [
                    b64chars.charAt(ord >>> 18),
                    b64chars.charAt((ord >>> 12) & 63),
                    padlen >= 2 ? '=' : b64chars.charAt((ord >>> 6) & 63),
                    padlen >= 1 ? '=' : b64chars.charAt(ord & 63)
                ];
            return chars.join('');
        };
        var btoa = global.btoa ? function (b) {
            return global.btoa(b);
        } : function (b) {
            return b.replace(/[\s\S]{1,3}/g, cb_encode);
        };
        var _encode = buffer
                ? function (u) {
                return (new buffer(u)).toString('base64')
            }
                : function (u) {
                return btoa(utob(u))
            }
            ;
        var encode = function (u, urisafe) {
            return !urisafe
                ? _encode(u)
                : _encode(u).replace(/[+\/]/g, function (m0) {
                return m0 == '+' ? '-' : '_';
            }).replace(/=/g, '');
        };
        var encodeURI = function (u) {
            return encode(u, true)
        };
        // decoder stuff
        var re_btou = new RegExp([
            '[\xC0-\xDF][\x80-\xBF]',
            '[\xE0-\xEF][\x80-\xBF]{2}',
            '[\xF0-\xF7][\x80-\xBF]{3}'
        ].join('|'), 'g');
        var cb_btou = function (cccc) {
            switch (cccc.length) {
                case 4:
                    var cp = ((0x07 & cccc.charCodeAt(0)) << 18)
                            | ((0x3f & cccc.charCodeAt(1)) << 12)
                            | ((0x3f & cccc.charCodeAt(2)) << 6)
                            | (0x3f & cccc.charCodeAt(3)),
                        offset = cp - 0x10000;
                    return (fromCharCode((offset >>> 10) + 0xD800)
                    + fromCharCode((offset & 0x3FF) + 0xDC00));
                case 3:
                    return fromCharCode(
                        ((0x0f & cccc.charCodeAt(0)) << 12)
                        | ((0x3f & cccc.charCodeAt(1)) << 6)
                        | (0x3f & cccc.charCodeAt(2))
                    );
                default:
                    return fromCharCode(
                        ((0x1f & cccc.charCodeAt(0)) << 6)
                        | (0x3f & cccc.charCodeAt(1))
                    );
            }
        };
        var btou = function (b) {
            return b.replace(re_btou, cb_btou);
        };
        var cb_decode = function (cccc) {
            var len = cccc.length,
                padlen = len % 4,
                n = (len > 0 ? b64tab[cccc.charAt(0)] << 18 : 0)
                    | (len > 1 ? b64tab[cccc.charAt(1)] << 12 : 0)
                    | (len > 2 ? b64tab[cccc.charAt(2)] << 6 : 0)
                    | (len > 3 ? b64tab[cccc.charAt(3)] : 0),
                chars = [
                    fromCharCode(n >>> 16),
                    fromCharCode((n >>> 8) & 0xff),
                    fromCharCode(n & 0xff)
                ];
            chars.length -= [0, 0, 2, 1][padlen];
            return chars.join('');
        };
        var atob = global.atob ? function (a) {
            return global.atob(a);
        } : function (a) {
            return a.replace(/[\s\S]{1,4}/g, cb_decode);
        };
        var _decode = buffer
            ? function (a) {
            return (new buffer(a, 'base64')).toString()
        }
            : function (a) {
            return btou(atob(a))
        };
        var decode = function (a) {
            return _decode(
                a.replace(/[-_]/g, function (m0) {
                    return m0 == '-' ? '+' : '/'
                })
                    .replace(/[^A-Za-z0-9\+\/]/g, '')
            );
        };
        var noConflict = function () {
            var Base64 = global.Base64;
            global.Base64 = _Base64;
            return Base64;
        };
        // export Base64
        global.Base64 = {
            VERSION: version,
            atob: atob,
            btoa: btoa,
            fromBase64: decode,
            toBase64: encode,
            utob: utob,
            encode: encode,
            encodeURI: encodeURI,
            btou: btou,
            decode: decode,
            noConflict: noConflict
        };
        // if ES5 is available, make Base64.extendString() available
        if (typeof Object.defineProperty === 'function') {
            var noEnum = function (v) {
                return {value: v, enumerable: false, writable: true, configurable: true};
            };
            global.Base64.extendString = function () {
                Object.defineProperty(
                    String.prototype, 'fromBase64', noEnum(function () {
                        return decode(this)
                    }));
                Object.defineProperty(
                    String.prototype, 'toBase64', noEnum(function (urisafe) {
                        return encode(this, urisafe)
                    }));
                Object.defineProperty(
                    String.prototype, 'toBase64URI', noEnum(function () {
                        return encode(this, true)
                    }));
            };
        }
        // that's it!
    })(Ctrtc);

//用 JS 实现了 SHA1 加密（单向）。
    (function (global) {
        //add by chm 20151125 to encrypt username
        var chrsz = 8;
        var hexcase = 0;
        /*   hex   output   format.   0   -   lowercase;   1   -   uppercase                 */
        var b64pad = "";
        /*   base-64   pad   character.   "="   for   strict   RFC   compliance       */

        /*   
         *   Bitwise   rotate   a   32-bit   number   to   the   left.   
         */
        function rol(num, cnt) {
            return (num << cnt) | (num >>> (32 - cnt));
        }

        /*   
         *   Perform   the   appropriate   triplet   combination   function   for   the   current   
         *   iteration   
         */
        function sha1_ft(t, b, c, d) {
            if (t < 20) return (b & c) | ((~b) & d);
            if (t < 40) return b ^ c ^ d;
            if (t < 60) return (b & c) | (b & d) | (c & d);
            return b ^ c ^ d;
        }

        /*   
         *   Determine   the   appropriate   additive   constant   for   the   current   iteration   
         */
        function sha1_kt(t) {
            return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
        }

        /*   
         *   Add   integers,   wrapping   at   2^32.   This   uses   16-bit   operations   internally   
         *   to   work   around   bugs   in   some   JS   interpreters.   
         */
        function safe_add(x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF);
            var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        }

        /*   
         *   Calculate   the   SHA-1   of   an   array   of   big-endian   words,   and   a   bit   length   
         */
        function core_sha1(x, len) {
            /*   append   padding   */
            x[len >> 5] |= 0x80 << (24 - len % 32);
            x[((len + 64 >> 9) << 4) + 15] = len;

            var w = Array(80);
            var a = 1732584193;
            var b = -271733879;
            var c = -1732584194;
            var d = 271733878;
            var e = -1009589776;

            for (var i = 0; i < x.length; i += 16) {
                var olda = a;
                var oldb = b;
                var oldc = c;
                var oldd = d;
                var olde = e;

                for (var j = 0; j < 80; j++) {
                    if (j < 16) w[j] = x[i + j];
                    else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
                    var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
                    e = d;
                    d = c;
                    c = rol(b, 30);
                    b = a;
                    a = t;
                }

                a = safe_add(a, olda);
                b = safe_add(b, oldb);
                c = safe_add(c, oldc);
                d = safe_add(d, oldd);
                e = safe_add(e, olde);
            }
            return Array(a, b, c, d, e);

        }

        /*   
         *   Convert   an   array   of   big-endian   words   to   a   hex   string.   
         */
        function binb2hex(binarray) {
            var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
            var str = "";
            for (var i = 0; i < binarray.length * 4; i++) {
                str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) + hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
            }
            return str;
        }

        /*   
         *   Convert   an   8-bit   or   16-bit   string   to   an   array   of   big-endian   words   
         *   In   8-bit   function,   characters   >255   have   their   hi-byte   silently   ignored.   
         */
        function str2binb(str) {
            var bin = Array();
            var mask = (1 << chrsz) - 1;
            for (var i = 0; i < str.length * chrsz; i += chrsz)
                bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
            return bin;
        }

        var encode = function (s) {
            return binb2hex(core_sha1(str2binb(s), s.length * chrsz));
        };

        global.SHA1 = {
            encode: encode
        };
    })(Ctrtc);

//用 JS 实现了 MD5 加密（单向）。
    (function (global) {
        var hexcase = 0;
        /* hex output format. 0 - lowercase; 1 - uppercase        */
        var b64pad = "";
        /* base-64 pad character. "=" for strict RFC compliance   */
        var chrsz = 8;
        /* bits per input character. 8 - ASCII; 16 - Unicode      */

        /*
         * These are the functions you'll usually want to call
         * They take string arguments and return either hex or base-64 encoded strings
         */
        function hex_md5(s) {
            return binl2hex(core_md5(str2binl(s), s.length * chrsz));
        }

        function b64_md5(s) {
            return binl2b64(core_md5(str2binl(s), s.length * chrsz));
        }

        function str_md5(s) {
            return binl2str(core_md5(str2binl(s), s.length * chrsz));
        }

        function hex_hmac_md5(key, data) {
            return binl2hex(core_hmac_md5(key, data));
        }

        function b64_hmac_md5(key, data) {
            return binl2b64(core_hmac_md5(key, data));
        }

        function str_hmac_md5(key, data) {
            return binl2str(core_hmac_md5(key, data));
        }

        /*
         * Perform a simple self-test to see if the VM is working
         */
        function md5_vm_test() {
            return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
        }

        /*
         * Calculate the MD5 of an array of little-endian words, and a bit length
         */
        function core_md5(x, len) {
            /* append padding */
            x[len >> 5] |= 0x80 << ((len) % 32);
            x[(((len + 64) >>> 9) << 4) + 14] = len;

            var a = 1732584193;
            var b = -271733879;
            var c = -1732584194;
            var d = 271733878;

            for (var i = 0; i < x.length; i += 16) {
                var olda = a;
                var oldb = b;
                var oldc = c;
                var oldd = d;

                a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
                d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
                c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
                b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
                a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
                d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
                c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
                b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
                a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
                d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
                c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
                b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
                a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
                d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
                c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
                b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);

                a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
                d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
                c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
                b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
                a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
                d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
                c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
                b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
                a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
                d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
                c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
                b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
                a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
                d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
                c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
                b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

                a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
                d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
                c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
                b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
                a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
                d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
                c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
                b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
                a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
                d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
                c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
                b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
                a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
                d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
                c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
                b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);

                a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
                d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
                c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
                b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
                a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
                d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
                c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
                b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
                a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
                d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
                c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
                b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
                a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
                d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
                c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
                b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);

                a = safe_add(a, olda);
                b = safe_add(b, oldb);
                c = safe_add(c, oldc);
                d = safe_add(d, oldd);
            }
            return Array(a, b, c, d);

        }

        /*
         * These functions implement the four basic operations the algorithm uses.
         */
        function md5_cmn(q, a, b, x, s, t) {
            return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
        }

        function md5_ff(a, b, c, d, x, s, t) {
            return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
        }

        function md5_gg(a, b, c, d, x, s, t) {
            return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
        }

        function md5_hh(a, b, c, d, x, s, t) {
            return md5_cmn(b ^ c ^ d, a, b, x, s, t);
        }

        function md5_ii(a, b, c, d, x, s, t) {
            return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
        }

        /*
         * Calculate the HMAC-MD5, of a key and some data
         */
        function core_hmac_md5(key, data) {
            var bkey = str2binl(key);
            if (bkey.length > 16) bkey = core_md5(bkey, key.length * chrsz);

            var ipad = Array(16), opad = Array(16);
            for (var i = 0; i < 16; i++) {
                ipad[i] = bkey[i] ^ 0x36363636;
                opad[i] = bkey[i] ^ 0x5C5C5C5C;
            }

            var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
            return core_md5(opad.concat(hash), 512 + 128);
        }

        /*
         * Add integers, wrapping at 2^32. This uses 16-bit operations internally
         * to work around bugs in some JS interpreters.
         */
        function safe_add(x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF);
            var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        }

        /*
         * Bitwise rotate a 32-bit number to the left.
         */
        function bit_rol(num, cnt) {
            return (num << cnt) | (num >>> (32 - cnt));
        }

        /*
         * Convert a string to an array of little-endian words
         * If chrsz is ASCII, characters >255 have their hi-byte silently ignored.
         */
        function str2binl(str) {
            var bin = Array();
            var mask = (1 << chrsz) - 1;
            for (var i = 0; i < str.length * chrsz; i += chrsz)
                bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (i % 32);
            return bin;
        }

        /*
         * Convert an array of little-endian words to a string
         */
        function binl2str(bin) {
            var str = "";
            var mask = (1 << chrsz) - 1;
            for (var i = 0; i < bin.length * 32; i += chrsz)
                str += String.fromCharCode((bin[i >> 5] >>> (i % 32)) & mask);
            return str;
        }

        /*
         * Convert an array of little-endian words to a hex string.
         */
        function binl2hex(binarray) {
            var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
            var str = "";
            for (var i = 0; i < binarray.length * 4; i++) {
                str += hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xF) +
                    hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8  )) & 0xF);
            }
            return str;
        }

        /*
         * Convert an array of little-endian words to a base-64 string
         */
        function binl2b64(binarray) {
            var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var str = "";
            for (var i = 0; i < binarray.length * 4; i += 3) {
                var triplet = (((binarray[i >> 2] >> 8 * ( i % 4)) & 0xFF) << 16)
                    | (((binarray[i + 1 >> 2] >> 8 * ((i + 1) % 4)) & 0xFF) << 8 )
                    | ((binarray[i + 2 >> 2] >> 8 * ((i + 2) % 4)) & 0xFF);
                for (var j = 0; j < 4; j++) {
                    if (i * 8 + j * 6 > binarray.length * 32) str += b64pad;
                    else str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
                }
            }
            return str;
        }

        global.MD5 = {
            encode: hex_md5
        };
    })(Ctrtc);

    window.Ctrtc = Ctrtc;
}(window));

//add by chm 20150504
window.onbeforeunload = function () {
    Ctrtc.Device.disconnectAll({unNormal: true});
};
