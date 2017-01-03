(function(window) {
    var Ctrtc = (function() {
        "use strict";

        var Ctrtc = {};


        return Ctrtc;
    }());


    //admin public

    var device = function() {
        var Url = 'http://124.127.117.201:9090/plugins/restapi/v1/';
        var stateStore = {};


        function getTimeStamp() {
            return parseInt(new Date().getTime() / 1000);
        }


        function encodeRegisterName(username, password) {
            var keyHex = CryptoJS.enc.Utf8.parse('ng!@#$%^');
            var ivHex = CryptoJS.enc.Utf8.parse('OYeoAZW4');
            var encryptedname = CryptoJS.DES.encrypt(username, keyHex, {
                iv: ivHex,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            var encryptedpasswd = CryptoJS.DES.encrypt(password, keyHex, {
                iv: ivHex,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });
            return encryptedname.toString() + '/' + encryptedpasswd.ciphertext.toString(CryptoJS.enc.Base64);
        }


        function encodeName(userName, userPass) {
            var encryptKey = "fam7X4YDvFeS4Lin5rplwIzyxhY=";

            var timestamp = parseInt(new Date().getTime() / 1000);
            var passwd = CryptoJS.HmacSHA1(timestamp + "," + CryptoJS.MD5(userPass), encryptKey);
            var base = userName + ":" + passwd;
            var authSecret = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(base));
            return timestamp + '/' + authSecret;
        }


        function getRegister(encodeRegisterName) {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', Url + 'register/123/123456/' + encodeRegisterName, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);

                    }
                    //  console.log(res.code);
                    if (res.code == 00001) {
                        stateStore.register = true;
                    } else if (res.code == 00002) {
                        if (res.reason == 10005) {
                            stateStore.register = "you've already registed!"
                        }
                    }

                }

            }
            xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.send();

        }


        function getSignIn(authsecret) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', Url + 'auth/' + authsecret, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        //console.log(res);
                        stateStore.signin = true;
                        stateStore.token = res.responseBody.token;
                        //console.log(stateStore.token);
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.send();

        }



        function getInfo(username) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', Url + 'users/' + username, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (res.code == 00001) {
                        stateStore.username = res.responseBody.username;
                        stateStore.nickname = res.responseBody.name;
                        stateStore.email = res.responseBody.email;
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        function changeInfo(email, password, nickname) {
            var reqInfo = {
                "password": password,
                "nickname": nickname,
                "email": email
            }
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', Url + 'users/'+stateStore.username, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (res.code == 00001) {
                        stateStore.changestate = true;
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(reqInfo));
        }

        //friendid是要加的id，toid是已经对于加好友处理的id。由于可能同时加很多人，且处理时间不同，所以要区分。
        function addNewFriend(friendid, reqreason) {
            var reqText = {
                "reqtext": reqreason
            };
            var xhr = new XMLHttpRequest();
            xhr.open('POST', Url + 'roster/request/123/' + stateStore.username + '/' + friendid, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (res.code == 00001) {
                        stateStore.reqfriend = "successfully send the request";
                    } else if (res.code == 00002 && res.reason == 40002) {
                        stateStore.reqfriend = "you two are already friend";
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(reqText));

        }

        function confirmFriend(toid) {
            var rspText = {
                "rsptext": "yes,accept"
            };
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', Url + 'roster/request/123/' + stateStore.username + '/' + toid, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (res.code == 00001) {
                        stateStore.reqfriend = "you have accept the friend request";
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }

        function refuseFriend(toid) {
            var refusereason = encodeURI('/sorry');
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'roster/request/123/' + stateStore.username + '/' + toid + refusereason, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (res.code == 00001) {
                        stateStore.reqfriend = "you have refuse the friend request";
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        function showContact() {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', Url + 'roster/' + stateStore.username + '/0', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        stateStore.allcontact = res.responseBody.rosters;
                        //console.log(stateStore.allcontact);
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();

        }


        function addItem(username) {
            var txt = '<a class="list-group-item isfriend"  href="#"><h4 class="list-group-item-heading">'+username+'</h4></a>';
            $('#customfriend').append(txt);
        }


        function addItemGroup(groupname,groupid) {
            var txt = '<a class="list-group-item isgroup"  href="#" value='+groupid+' ><h4 class="list-group-item-heading">'+groupname+'</h4></a>';
            $('#customgroup').append(txt);
        }



        function addItemToShow(username) {
           var txt = '<div class="form-group col-xs-3"><div><label><input type="checkbox" class="selectbox" value='+ JSON.stringify(username) +'>'+username.username+'</label></div></div>';
            $('#selectfriend').append(txt);
        }


        function addItemToShow2(username) {
           var txt = '<div class="form-group col-xs-3"><div ><label><input type="checkbox" class="selectbox2" value='+ JSON.stringify(username) +'>'+username.username+'</label></div></div>';
            $('#selectfriend2').append(txt);
        }

        function addItemToShow3(username) {

            var txt = '<div class="form-group col-xs-3"><div ><label><input type="radio" class="selectbox3" value='+ JSON.stringify(username) +'>'+username.username+'</label></div></div>';
            $('#selectfriend3').append(txt);
        }


        function deleteFriend(deleteid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'roster/123/' + stateStore.username + '/' + deleteid, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除好友请求ok");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        //当添加方收到被添加方同意好友请求的通知消息后，添加方回调此接口删除同意好友请求的通知消息。
        function deleteAR(toid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'roster/request/noti/' + stateStore.username + '/' + toid + '/102', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        console.log("删除同意好友请求消息回调接口ok ");
                        //console.log(stateStore.allcontact);
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        //当添加方收到被添加方拒绝好友请求的通知消息后，添加方回调此接口删除拒绝好友请求的通知消息。
        function deleteRR(toid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'roster/request/noti/' + stateStore.username + '/' + toid + '/103', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        console.log("删除拒绝好友请求消息回调接口ok ");
                        //console.log(stateStore.allcontact);
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        //当被删除方收到删除方发送的删除通知消息后，被删除方刷新好友列表数据后回调此接口删除删除好友的通知消息。
        function deleteDF(deleteid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'roster/noti/' + stateStore.username + '/' + deleteid + '/104', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除删除好友消息回调接口ok  ");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();

        }


        function createGroup(arr,groupname) {
            var reqText = {
                "groupname": groupname,
                "description": "new group",
                "createuser": stateStore.username,
                "monitors": stateStore.username,
                "maxusers": "50",
                "isagreeinvite": "0",
                "ispublic": "1",
                "reqtext": "我新建了一个群",
                "users": arr

            };
            var xhr = new XMLHttpRequest();
            xhr.open('POST', Url + 'groups/123/' + stateStore.username, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (res.code == 00001) {
                        alert("创建群组成功");
                    }

                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(reqText));
        }


        function showGroup() {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', Url + 'users/groups/' + stateStore.username + '/0', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        stateStore.allgroup = res.responseBody.groups;
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }



        function deleteGroup(id) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groups/123/' + id + '/' + stateStore.username, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除群组请求ok");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }



        function confirmGroup(inviteid, username, groupid) {
            var rspText = {
                "reqtext": "我想拉你入群",
                "rsptext": "ok"
            };
            var xhr = new XMLHttpRequest();
            xhr.open('POST', Url + 'groupManage/123/' + username + '/' + inviteid + '/' + groupid + '/0', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (res.code == 00001) {
                        console.log("成功加入群组" + res.responseBody.groupname);
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }



        function refuseGroup(inviteid, username, groupid) {
            var rspText = {
                "reqtext": "我想拉你入群",
                "rsptext": "sorry"
            };
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', Url + 'groupManage/123/' + username + '/' + inviteid + '/' + groupid + '/0', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                    }
                    if (res.code == 00001) {
                        console.log("您已经拒绝了群组");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }


        function showGroupInfo(id) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', Url + 'groups/' + id + '/0', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        var users = "群组成员：";
                        var n = res.responseBody.users.add.length;
                        for (var i = 0; i < n; i++) {
                            var j=i+1;
                            users += "成员" + j + ":" + res.responseBody.users.add[i].username;
                        }
                        var message = "群组名：" + res.responseBody.groupname + "\n" + "description" + res.responseBody.description + "\n" + users;
                        alert(message);
                        stateStore.ingroupmenber=res.responseBody.users;
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        function searchGroupName(groupname) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', Url + 'groups/search/' + stateStore.username + '/' + groupname, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        stateStore.groupid = res.responseBody.groups[0].groupid;
                        console.log("成功搜索到群组id");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }else if(res.code == 00002){
                        if(res.reason == 50004){
                            alert("群组不存在");
                        }
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        function renameGroup(groupid,rename) {
            rspText = {
                "groupname": rename
            };
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', Url + 'groups/123/' + groupid + '/' + stateStore.username, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        console.log("修改名字成功");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }


        function addGroup(groupid,reason) {
            rspText = {
                "reqtext": reason
            };
            var xhr = new XMLHttpRequest();
            xhr.open('POST', Url + 'groupManage/123/' + stateStore.username + '/' + groupid + '/0', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        console.log("申请入群已发送");
                        
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }


        function acceptToGroup(reqname, groupid) {
            rspText = {
                "reqtext": "我想加入群",
                "rsptext": "终于来了"
            };
            var xhr = new XMLHttpRequest();
            xhr.open('POST', Url + 'groupManage/123/' + reqname + '/' + stateStore.username + '/' + groupid + '/1', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        console.log("已经同意加入群组");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }



        function refuseToGroup(reqname, groupid) {
            rspText = {
                "reqtext": "我想加入群",
                "rsptext": "我们很熟么？"
            };
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', Url + 'groupManage/123/' + reqname + '/' + stateStore.username + '/' + groupid + '/1', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        console.log("已经拒绝加入群组");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }


        function inviteToGroup(arr,groupid) {
            rspText = {
                "reqtext": "我想拉你入群",
                "users": arr
            };
            var xhr = new XMLHttpRequest();
            xhr.open('POST', Url + 'groupManage/123/' + groupid + '/' + stateStore.username + '/1', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        console.log("邀请入群消息已发送");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }



        function quitGroup(groupid) {
            rspText = {
                "reqtext": "我想退群了"
            };
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/123/' + stateStore.username + '/' + groupid + '/1', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        console.log("已经退出群");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }

        function removeFromGroup(kickname,groupid) {
            rspText = {
                "reqtext": "容不下你"
            };
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/123/'+kickname+'/' + groupid + '/' + stateStore.username, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        console.log("已经踢出群");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }


        //当前端确认管理员同意用户入群组消息已送达时回调此接口删除消息。
        function deleteATG(reqname, groupid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/noti/u/' + reqname + '/' + groupid + '/205', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除管理员同意用户入群组消息回调接口ok ");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }



        //当前端确认管理员拒绝用户入群组消息已送达时回调此接口删除消息。
        function deleteRTG(reqname, groupid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/noti/u/' + reqname + '/' + groupid + '/206', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除管理员拒绝用户入群组消息回调接口ok ");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }



        function deleteRFG(kickname,groupid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/noti/u/'+kickname + '/' + groupid + '/207', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除管理员踢除用户消息回调接口ok ");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        //当前端确认群组人员增加通知消息已送达时回调此接口删除消息。
        function deleteNewIn(groupid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/noti/u/' + stateStore.username + '/' + groupid + '/209', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除群组人员增加通知消息回调接口ok ");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        //当前端确认群组人员减少通知消息已送达时回调此接口删除消息。
        function deleteQuit(groupid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/noti/u/' + stateStore.username + '/' + groupid + '/210', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除群组人员减少通知消息回调接口ok");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        //当前端确认群组解散通知消息已送达时回调此接口删除消息。
        function deleteDG(groupid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/noti/u/' + stateStore.username + '/' + groupid + '/211', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除群组解散通知消息回调接口ok");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        //当前端确认群组信息修改通知消息已送达时回调此接口删除消息
        function deleteRG(groupid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/noti/u/' + stateStore.username + '/' + groupid + '/212', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除群组信息修改通知消息回调接口ok ");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        //当前端确认用户同意群组邀请通知消息已送达时回调此接口删除消息
        function deleteAJG(rspname, groupid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/noti/m/' + stateStore.username + '/' + rspname + '/' + groupid + '/202', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除用户同意群组邀请通知消息回调接口ok ");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        //当前端确认用户拒绝群组邀请通知消息已送达时回调此接口删除消息
        function deleteRJG(rspname, groupid) {
            var xhr = new XMLHttpRequest();
            xhr.open('DELETE', Url + 'groupManage/noti/m/' + stateStore.username + '/' + rspname + '/' + groupid + '/203', false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("删除用户拒绝群组邀请通知消息回调接口ok ");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }



        //<----------chat---------------->


        function sendMessage(id,groupid,type, message) {
            //console.log(groupid);
            var timestamp = parseInt(new Date().getTime() / 1000);
            rspText = {
                "from": stateStore.username,
                "to": id,
                "timestamp": timestamp,
                "chattype": type,
                "groupid": groupid,
                "bodies": [{
                    "msgtype": "txt",
                    "msg": message
                }],
                "ext": {
                    "nick": stateStore.nickname,
                    "avatar": "avatar",
                    "email": stateStore.email
                }
            };
            var xhr = new XMLHttpRequest();
            xhr.open('POST', Url + 'messages/send/123/' + stateStore.username + '/' + id + '/' + timestamp, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {
                        console.log("已经发送消息");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send("formdata=" + JSON.stringify(rspText));
        }



        function confirmRM(from, to, chattype, timestamp) {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', Url + 'messages/reccallback/' + from + '/' + to + '/' + chattype + '/' + timestamp, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("发送消息已达回执ok");
                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }



        function getOfflineMes() {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', Url + 'messages/offline/' + stateStore.username, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("获取离线消息ok");
                        if (res.hasnext == 1) {
                            Ctrtc.Device.getofflineallmes();
                        }
                    } else if (res.code == 00003) {
                        alert("failed");
                    } else if (res.code == 00002) {
                        if (res.reason == 70007) {
                            console.log("no unreceive message");
                        }

                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }



        function getOfflineAllMes() {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', Url + 'userNoti/' + stateStore.username, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("获取登录用户的所有离线通知消息ok");

                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }



        function getDynamic(authsecret) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', Url + 'property/' + authsecret, false);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var res;
                    if (typeof(JSON) == 'undefined') {
                        res = eval("(" + xhr.responseText + ")");
                    } else {
                        res = JSON.parse(xhr.responseText);
                        //  console.log(res.responseBody.token);
                    }
                    if (res.code == 00001) {

                        console.log("获取动态配置项ok");

                    } else if (res.code == 00003) {
                        alert("failed");
                    }
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json ;charset=utf-8");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Authorization", stateStore.token);
            xhr.send();
        }


        function refreshList(){

        $('#customfriend').html(" ");
        if (Ctrtc.Device.Ushowcontact() != null) {
            var contact = Ctrtc.Device.Ushowcontact();

            //console.log(contact.add.length);
            var n = contact.add.length;
            for (var i = 0; i < n; i++) {
                var username = contact.add[i].username;
                Ctrtc.Device.Uadditem(username);
            }


        } else {
            $('#customfriend').append("<h2 class='text-center'>empty contact</h2>");
        }
    
        $('#customgroup').html(" ");
        if (Ctrtc.Device.Ushowgroup() != null) {
            var group = Ctrtc.Device.Ushowgroup();

            var n = group.add.length;
            for (var i = 0; i < n; i++) {
                var groupname = group.add[i].groupname;
                var groupid=group.add[i].groupid;
                Ctrtc.Device.Uadditemgroup(groupname,groupid);
            }

        } else {
            $('#customgroup').append(" <p>empty group</p>");
        }
    
        $('.list-group-item').click(function() {
            $(this).addClass('active');
            $(this).siblings().removeClass('active');
            var username = $(this).text();
            $('#fgid').html(username + '<span class="glyphicon glyphicon-hand-right"></span>');
            if ($(this).hasClass('isfriend')) {
                $('#delete').text('删除好友');
                $('#fgid').val("0");

            } else {
                $('#delete').text('退出群组');
                $('#detailinfo').text('获取群组详细信息');
                $('#deletegroup').text('删除群组');
                $('#changegroupinfo').text('修改群组名称');
                $('#invitetogroup').text('邀请入群');
                $('#kickfromgroup').text('将成员踢出群');
                $('#fgid').val("1");

            }
        })

        }


        return {
            //注册
            Uregister: function(username, password) {
                var name = encodeRegisterName(username, password);
                getRegister(name);
                return stateStore.register;
                //alert(stateStore.register);

            },
            //登录
            Usignin: function(username, password) {
                stateStore.username = username;
                var authsecret = encodeName(username, password);
                getSignIn(authsecret);
                return stateStore.signin;
            },
            //获取用户信息
            Ugetinfo: function() {
                getInfo(stateStore.username);
                var info = "your name:" + decodeURI(stateStore.username) + "\n" + "nickname:" + stateStore.nickname + "\n" + "email:" + stateStore.email;
                //alert(info);
                $('#userinfo').text(info);
                return stateStore.username;
            },
            //修改用户信息
            Uchangeinfo: function(email, password, nickname) {
                changeInfo(email, password, nickname);
                console.log(stateStore.changestate);
            },
            //添加好友
            Uaddnewfriend: function(friendid, reqreason) {
                addNewFriend(friendid, reqreason);
                return stateStore.reqfriend;
                //alert(stateStore.reqfriend);
            },
            //确认好友
            Uconfirmfriend: function(toid) {
                confirmFriend(toid);
                alert(stateStore.reqfriend);
            },
            //拒绝好友请求
            Urefusefriend: function(toid) {
                refuseFriend(toid);
                alert(stateStore.reqfriend);
            },
            //查看好友
            Ushowcontact: function() {
                showContact();
                return stateStore.allcontact;
            },
            //方法，把好友显示在屏幕上
            Uadditem: function(username) {
                addItem(username);
            },
            //方法，群组
            Uadditemgroup: function(groupname,groupid){
                addItemGroup(groupname,groupid);
            },
            //方法，显示邀请好友列表
             Uadditemtoshow: function(username){
                addItemToShow(username);
            },
            //方法，显示邀请入群列表
            Uadditemtoshow2: function(username){
                addItemToShow2(username);
            },
            //方法，踢出好友列表
             Uadditemtoshow3: function(username){
                addItemToShow3(username);
            },
            //删除好友
            Udeletefriend: function(deleteid) {
                deleteFriend(deleteid);
            },
            //一下皆为删除回调函数
            Udeletedf: function(deleteid){
                deleteDF(deleteid);
            },
            Udeletear: function(toid) {
                deleteAR(toid);
            },
            Udeleterr: function(toid) {
                deleteRR(toid);
            },
            //创建群组
            Ucreategroup: function(arr,groupname) {
                createGroup(arr,groupname);
            },
            //显示群组
            Ushowgroup: function() {
                showGroup();
                //alert(stateStore.allgroup);
               // console.log(stateStore.allgroup);
                return stateStore.allgroup;
            },
            //删除群组
            Udeletegroup: function(id) {
                deleteGroup(id);
            },
            //确认加入群组
            Uconfirmgroup: function(inviteid, username, groupid) {
                confirmGroup(inviteid, username, groupid);
            },
            //拒绝加入群组
            Urefusegroup: function(inviteid, username, groupid) {
                refuseGroup(inviteid, username, groupid);
            },
            //显示群组消息
            Ushowgroupinfo: function(id) {
                showGroupInfo(id);
                return stateStore.ingroupmenber;
            },
            //通过名字搜索群组
            Usearchgroupname: function(groupname) {
                searchGroupName(groupname);
                return stateStore.groupid;
            },
            //修改群组名字
            Urenamegroup: function(groupid,rename) {
                renameGroup(groupid,rename);
            },
            //添加群组
            Uaddgroup: function(groupid,reason) {
                addGroup(groupid,reason);
            },
            //同意邀请入群请求
            Uaccepttogroup: function(reqname, groupid) {
                acceptToGroup(reqname, groupid);
            },
            //拒绝入群
            Urefusetogroup: function(reqname, groupid) {
                refuseToGroup(reqname, groupid);
            },
            //邀请好友入群
            Uinvitetogroup: function(arr,groupid) {
                inviteToGroup(arr,groupid);
            },
            //退出群组
            Uquitgroup: function(groupid) {
                quitGroup(groupid);
            },
            //将用户踢出群
            Uremovefromgroup: function(kickname,groupid) {
                removeFromGroup(kickname,groupid);
            },
            //以下皆为删除回调函数
            Udeleteatg: function(reqname, groupid) {
                deleteATG(reqname, groupid);
            },
            Udeletertg: function(reqname, groupid) {
                deleteRTG(reqname, groupid);
            },
            Udeleterfg: function(kickname,groupid) {
                deleteRFG(kickname,groupid);
            },
            Udeletenewin: function(groupid) {
                deleteNewIn(groupid);
            },
            Udeletequit: function(groupid) {
                deleteQuit(groupid);
            },
            Udeletedg: function(groupid) {
                deleteDG(groupid);
            },
            Udeleterg: function(groupid) {
                deleteRG(groupid);
            },
            Udeleteajg: function(rspname, groupid) {
                deleteAJG(groupid);
            },
            Udeleterjg: function(rspname, groupid) {
                deleteRJG(groupid);
            },


            //发送消息
            Usendmessage: function(id,groupid, type, message) {
                sendMessage(id, groupid,type, message);
            },
            //删除回调函数
            Uconfirmrm: function(from, to, chattype, timestamp) {
                confirmRM(from, to, chattype, timestamp);
            },
            Ugetofflinemes: function() {
                getOfflineMes();
            },
            Ugetofflineallmes: function() {
                getOfflineAllMes();
            },
            Ugetdynamic:function(username, password) {

                var authsecret = encodeName(username, password);

                getDynamic(authsecret);
            },
            //刷新好友列表和群组列表
            Urefreshlist:function(){
                refreshList();
            }


        }

    }();

    Ctrtc.Device = device;
    window.Ctrtc = Ctrtc;

})(window);