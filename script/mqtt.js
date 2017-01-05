(function(window) {
	var Mqtt = (function() {
		"use strict";

		var Mqtt = {};

		return Mqtt;
	}());

	var device = function() {
		var host = '124.127.117.201';
		var port = 15675;
		var path = "/ws";
		var client_id;
		//'C_' + new Date().getTime();
		var infoStore = {};

		function onConnectionLost(responseObject) {
			if (responseObject.errorCode != 0) {
				console.log("onConnectionLost" + responseObject.errorMessage);
			}
		}

		function onMessageArrived(message) {
			//console.log("onMessageArrived:" + message.payloadString);
			var res;
			if (typeof(JSON) == 'undefined') {
				res = eval("(" + message.payloadString + ")");
			} else {
				res = JSON.parse(message.payloadString);
			}
			console.log(res);
			//type":101,"id":"76c0630c83044c62993a9b12f75faa64","from":"chenyitian","fromnick":"centmaster","to":"chenyitian1","reqtext":"hello stephen!"}
			if (res.type == 101) {
				var addMessage = "id:" + res.from + '\n' + 'nickname:' + res.fromnick + '\n' + "say:" + res.reqtext + '\n' + "want to add to your contact";
				var question = confirm(addMessage);
				infoStore.selfid = res.from;
				if (question) {
					//console.log(infoStore.selfid+'!!!!');
					Ctrtc.Device.Uconfirmfriend(infoStore.selfid);
					Ctrtc.Device.Urefreshlist();
					Ctrtc.Device.Udeletear(infoStore.selfid);
				} else {
					//console.log(infoStore.selfid);
					Ctrtc.Device.Urefusefriend(infoStore.selfid);
					Ctrtc.Device.Udeleterr(infoStore.selfid);
				}
			} else if (res.type == 102) {
				var acceptMessage = "id:" + res.from + '\n' + 'accept your request!';
				alert(acceptMessage);
				Ctrtc.Device.Urefreshlist();
			} else if (res.type == 103) {
				var refuseMessage = "id:" + res.from + '\n' + 'refuse your request!';
				alert(refuseMessage);
			}
			//201选择是否加入群组
			if (res.type == 201) {
				var addMessage = "用户:" + res.from + '\n' + "新建了一个群" + res.groupname + "选择确认加入群";
				var deter = confirm(addMessage);
				var inviteid = res.from;
				var username = res.to;
				var groupid = res.groupid;
				if (deter) {
					Ctrtc.Device.Uconfirmgroup(inviteid, username, groupid);
					Ctrtc.Device.Urefreshlist();
					Mqtt.Device.Usubscribegroup(res.groupid);
				} else {
					Ctrtc.Device.Urefusegroup(inviteid, username, groupid);
				}
			}
			//202同意加入群
			if (res.type == 202) {
				var message = "用户：" + res.from + "已经同意加入您的群" + res.groupname;
				alert(message);
				Ctrtc.Device.Udeleteajg(res.frome, res.groupid);
				Mqtt.Device.Usubscribegroup(res.groupid);
			}
			//203拒绝加入群
			if (res.type == 203) {
				var message = "用户：" + res.from + "拒绝加入您的群" + res.groupname;
				alert(message);
				Ctrtc.Device.Udeleterjg(res.from, res.groupid);
			}
			//204是否同意申请入群
			if (res.type == 204) {
				var message = "用户：" + res.from + "想要加入群" + res.groupname + "附言:" + res.reqtext + '\n' + "点击确认同意加群";
				var groupid = res.groupid;
				var reqname = res.from;
				var deter = confirm(message);
				if (deter) {
					Ctrtc.Device.Uaccepttogroup(reqname, groupid);
					Ctrtc.Device.Udeleteatg(reqname, groupid);
				} else {
					Ctrtc.Device.Urefusetogroup(reqname, groupid);
					Ctrtc.Device.Udeletertg(reqname, groupid);
				}
			}
			//205通过申请入群
			if (res.type == 205) {
				console.log("管理员通过了您的入群申请");
				Mqtt.Device.Usubscribegroup(res.groupid);
			}
			//206被拒绝申请入群
			if (res.type == 206) {
				alert("群主拒绝了你的入群要求，并附言" + res.rsptext);
			}
			//207退出群组
			if (res.type == 207) {
				console.log("您已退出群聊:" + res.groupname + res.reqtext);
				Ctrtc.Device.Udeleteqg()
			}
			//209当有新的成员加入群时所有群成员收到
			if (res.type == 209) {
				var groupid = res.groupid;
				console.log("新的成员:" + res.to + "加入群:" + groupid);
				Ctrtc.Device.Udeletenewin(groupid);
			}
			//210退出群
			if (res.type == 210) {
				var groupid = res.groupid;
				console.log("成员:" + res.to + "退出了群:" + res.groupname);
				Ctrtc.Device.Udeletequit(groupid);
			}
			//211群被删除
			if (res.type == 211) {
				alert("群主：" + res.from + '\n' + "删除群组:" + res.groupname);
				Ctrtc.Device.Udeletedg(res.groupid);
			}
			//212群名称被修改
			if (res.type == 212) {
				alert("用户：" + res.from + "修改了群名称，新的群名称为：" + res.groupname);
				Ctrtc.Device.Udeleterg(res.groupid);
				Ctrtc.Device.Urefreshlist();
				Mqtt.Device.Usubscribegroup(res.groupid);
			}
			//type：1 收到群组或好友发送的消息
			//console.log("["+res.timestamp+"]"+res.from+" : " +res.bodies[0].msg)；
			//receive message
			if (res.type == 1) {
				var date = new Date();
				//console.log(res.from+" : " +res.bodies[0].msg);
				if (!(res.from == Mqtt.from && res.to == Mqtt.to)) {
					$('#panelpad').text("");
				}
				$('#fgid').text("" + res.from + "");


				if (res.bodies[0].msgtype == "txt") {
					var date = new Date();
					if (res.chattype == 0) {
						$('#fgid').text(res.from);
					} else if (res.chattype == 1) {
						var groupname;
						$('.isgroup').each(function() {
							if ($(this).attr("value") == res.to) {
								$('#fgid').text($(this).text());
							}

						})
					}
					if (res.from != Ctrtc.Device.Ugetinfo()) {
						$('#panelpad').append('[' + date.toLocaleString() + ']' + '&nbsp;&nbsp; user~' + res.from + ':' + decodeURI(res.bodies[0].msg) + "<br>");
					}

				} else if (res.bodies[0].msgtype == "audio") {
					
					$('#panelpad').append('<audio src="'+res.bodies[0].url+'"></audio>' + "<br>");

				} else if (res.bodies[0].msgtype == "img") {
					
					$('#panelpad').append('[' + date.toLocaleString() + ']' + '&nbsp;&nbsp; user~' + res.from + ':' +'<img style="height:68px;width:140px; vertical-align:top" src="' + res.bodies[0].url + '" onclick="showMask()"/>' + "<br><br><br>");
					$('#picmask').append('<img style=" display:none "  id="picshow" src="' + res.bodies[0].url + '"/>');
				} else if (res.bodies[0].msgtype == "file") {
					$('#panelpad').append('[' + date.toLocaleString() + ']' + '&nbsp;&nbsp; user~' + res.from + ':' +'<a href="'+res.bodies[0].url+'" target="_blank">收到新的文件点我下载</a><br><br><br>');
				} else if (res.bodies[0].msgtype == "video") {
					$('#panelpad').append('[' + date.toLocaleString() + ']' + '&nbsp;&nbsp; user~' + res.from + ':' +'<video src="' + res.bodies[0].url + '"controls="controls" style="vertical-align:top" width="200" height="180">您的浏览器版本过低</video>' + "<br><br><br>")
				} else if (res.bodies[0].msgtype == "loc") {
					//确定城市
					var city = res.bodies[0].addr.indexOf('市')
					var addr = res.bodies[0].addr.substring(2, city);

					$('#panelpad').append('[' + date.toLocaleString() + ']' + '&nbsp;&nbsp; user~' + res.from + ':' +'<p class=".text-muted">'+res.bodies[0].addr+'</p>'+'<br>'+'<div id="allmap" style="height:300px;width:550px"></div>'+ "<br><br><br>");
					var lat = res.bodies[0].lat;
					var lng = res.bodies[0].lng;
					// 百度地图API功能
					var map = new BMap.Map("allmap"); // 创建Map实例
					map.centerAndZoom(new BMap.Point(lng, lat), 16); // 初始化地图,设置中心点坐标和地图级别
					var point = new BMap.Point(lng,lat);
					var marker = new BMap.Marker(point); // 创建标注
					map.addOverlay(marker);
					map.addControl(new BMap.MapTypeControl()); //添加地图类型控件
					map.setCurrentCity(addr); // 设置地图显示的城市 此项是必须设置的
					map.enableScrollWheelZoom(true); //开启鼠标滚轮缩放
				}

				Mqtt.from = res.from;
				Mqtt.to = res.to;

				Ctrtc.Device.Uconfirmrm(res.from, res.to, res.chattype, res.timestamp);
			}

			//var time = '[' + (new Date()).format("yyyy-MM-dd hh:mm:ss") + '] :';
			//$('#receive_message').append(time + message.payloadString + '<cite>' + '</cite></q>' + '<br>');
		}

		var client = null;

		function connect(username) {
			client_id = username; //+'~123~Browser';
			client = new Paho.MQTT.Client(host, port, path, client_id);
			//alert(client_id);
			client.onConnectionLost = onConnectionLost;
			client.onMessageArrived = onMessageArrived;

			var options = {
				cleanSession: false,
				onSuccess: function() {
					console.log("The client connect success");
				}
			};
			client.connect(options);
			//console.log(client.isConnected());
		}

		function disconnect() {
			client.disconnect();
			console.log("client disconnect success");
			$('#deter_connect').append("disconnected");
		}

		function subscribe(topic) {
			client.subscribe(topic);
			console.log("you've subscribe the topic " + topic);
		}

		function unsubscribe() {
			client.unsubscribe();
			console.log("success unsubscribe");
		}


		function sendMessage(msg) {
			var message = new Paho.MQTT.Message(msg);
			message.destinationName = $('#topictosend').val();
			client.send(message);
			// alert(msg);
		}


		return {
			Ubegin: function(username) {
				if (client == null || !client.isConnected()) {
					connect(username);
				}

			},

			Usubscribe: function(username) {
				var topic = '/123/clients/' + username + '/inbox';
				subscribe(topic);
				return infoStore.friendreq;
			},

			Usubscribegroup: function(groupid) {
				var topic = '/123/groups/' + groupid + '/inbox';
				subscribe(topic);
			},
			Uunsubscribe: function() {
				unsubscribe();
			}

		}
	}();

	Mqtt.Device = device;
	window.Mqtt = Mqtt;

})(window);