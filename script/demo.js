	//点击群组列表标题
	function groupclick() {
		$('#customgroup').css(
			'display', 'block');
		$('#customgroup').addClass('active');
		$('#customfriend').css('display', 'none');
		$('#customfriend').removeClass('active');
		$('#btn-group').addClass('active');
		$('#btn-friend').removeClass('active');
	}
	//点击好友列表标题
	function friendclick() {
		$('#customfriend').css(
			'display', 'block');
		$('#customfriend').addClass('active');
		$('#customgroup').css('display', 'none');
		$('#customgroup').removeClass('active');
		$('#btn-friend').addClass('active');
		$('#btn-group').removeClass('active');
	}
	//修改用户信息
	function changeinfo() {
		var email = encodeURI($('#changeemail').val());
		var nickname = encodeURI($('#changenickname').val());
		var password = encodeURI($('#changepassword').val());
		Ctrtc.Device.Uchangeinfo(email, password, nickname);
		$('#myModalchangeinfo').modal('hide');
	}

	//申请添加好友
	function reqfriend() {
		var friendid = encodeURI($('#friendid').val());
		var reqreason = encodeURI($('#reqreason').val());
		if (friendid == 'undefined' || reqreason == 'undefined') return;
		var res = Ctrtc.Device.Uaddnewfriend(friendid, reqreason);
		$('.contact').after(' ');
		$('.contact').after('<div class="alert alert-success">' + res + '</div>');
		$('#myModaladdfriend').modal('hide');
	}

	//获取好友列表
	function friendlist() {
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
	}


	//获取群组列表
	function grouplist() {
		$('#customgroup').html(" ");
		if (Ctrtc.Device.Ushowgroup().add.length) {
			var group = Ctrtc.Device.Ushowgroup();
			console.log(group.add);

			var n = group.add.length;
			for (var i = 0; i < n; i++) {
				var groupname = group.add[i].groupname;
				var groupid = group.add[i].groupid;
				//console.log("groupid:"+groupid);
				Ctrtc.Device.Uadditemgroup(groupname, groupid);
			}

		} else {

			$('#customgroup').append("<h2 class='text-center'>empty group</h2>");
		}

	}


	//设置监听点击列表
	function listener() {
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



	//获取群组详细信息
	function groupinfo() {
		var groupname = $('#fgid').text();
		var groupid = Ctrtc.Device.Usearchgroupname(groupname); //通过groupname查找groupid
		Ctrtc.Device.Ushowgroupinfo(groupid);
	}


	//删除群组
	function deletegroup() {
		var groupname = $('#fgid').text();
		var groupid = Ctrtc.Device.Usearchgroupname(groupname); //通过groupname查找groupid
		Ctrtc.Device.Udeletegroup(groupid);
		grouplist();
		listener();
	}

	//用户添加群组
	function addgroup() {
		var groupname = $('#addgroupid').val();
		var groupid = Ctrtc.Device.Usearchgroupname(groupname); //通过groupname查找groupid
		var reason = $('#addgroupreason').val();
		Ctrtc.Device.Uaddgroup(groupid, reason);
		Ctrtc.Device.Urefreshlist();

		$('.contact').after(' ');
		$('.contact').after('<div class="alert alert-success" style="float:left;">申请入群已发送</div>');

	}

	//用户发送消息
	function sendmessage() {
		var date = new Date();
		var id = $('#fgid').text();
		//console.log(id);
		var message = $('#messagepad').val();
		$('#messagepad').val("");
		$('#panelpad').append(date.toLocaleString() + ':' + message + "<br>");
		var chattype = 0;
		var groupid = 0;
		//判断发给好友还是群组
		if ($('#fgid').val() == 1) {
			groupid = Ctrtc.Device.Usearchgroupname(id); //通过groupname查找groupid
			//console.log(groupid);
			chattype = 1;
			Ctrtc.Device.Usendmessage(groupid, groupid, chattype, message);
		} else if ($('#fgid').val() == 0) {
			Ctrtc.Device.Usendmessage(id, groupid, chattype, message);
		}
	}

	//退出登录 与默认登录对应
	function logout() {
		$.cookie("username", null);
		$.cookie('password', null);
		window.location.reload();
	}


	function showMask(){

		$(".mask1").css("height",$(document).height());     
        $(".mask1").css("width",$(document).width());     
        $(".mask1").show();
        $('#picshow').show();
	}

	function hideMask(){
		$('.mask1').hide();
	}

	function receivetxt(URL){
		window.href="www.baidu.com";
	}



	$(document).ready(function() {


		var store = {};

		//检查浏览器
		if (!window.WebSocket) {
			alert("please change another browser");
		}


		//如果浏览器缓存存贮用户信息且选择选项，则自动登录
		var dusername = $.cookie("username");
		var dpassword = $.cookie("password");
		if (dusername && dpassword) {
			var res = Ctrtc.Device.Usignin(dusername, dpassword);
			if (res) {
				Ctrtc.Device.Ugetofflinemes();
				Mqtt.Device.Usubscribe(dusername);
				Ctrtc.Device.Ugetdynamic(dusername, dpassword);
				$('#showusername').text($('#username').val());
				friendlist();
				grouplist();
				listener();

			}

		} else {
			//一刷新页面就出现登录模态框
			$('#signin-signup-tab').modal('show');
		}


		//$('#signin-signup-tab').modal('show');



		//输入账号和密码进行注册
		$('#signup').click(function() {
			var username = encodeURI($('#username1').val());
			var password = encodeURI($('#password1').val());
			var confirmpassword = encodeURI($('#password2').val());
			if (password != confirmpassword) {
				$('#signup').after(' ');
				$('#signup').after('<div class="alert alert-warning">警告！您输入的两次密码不一致.</div>');
				return;
			}
			var res = Ctrtc.Device.Uregister(username, password);
			if (res) {
				$('#signin-signup-tab').modal('show');
				$('#signup').after(' ');
				$('#signup').after('<div class="alert alert-success">注册成功!</div>');
				$('#username1').val('');
				$('#password1').val('');
				$('#password2').val('');
			}
		})

		//登录
		$('#signin').click(function() {
			var username = encodeURI($('#username').val());
			var password = encodeURI($('#password').val());
			var res = Ctrtc.Device.Usignin(username, password);
			if (res) {
				Ctrtc.Device.Ugetofflinemes();
				//链接mqtt
				Mqtt.Device.Ubegin(username);

				Ctrtc.Device.Ugetdynamic(username, password);
				$('#showusername').text($('#username').val());
				friendlist();
				grouplist();
				listener();
				if ($("#rmbme").is(':checked')) {
					var username = encodeURI($('#username').val());
					var password = encodeURI($('#password').val());
					$.cookie("username", username, {
						expires: 7
					});
					$.cookie("password", password, {
						expires: 7
					});

				}

				Mqtt.Device.Usubscribe($('#showusername').text());
				$('#signin-signup-tab').modal('hide');
			} else {
				$('#signin').after(' ');
				$('#signin').after('<div class="alert alert-warning">登录失败!</div>');
			}

		})


		//显示个人信息
		$('#showusername').click(function() {
			Ctrtc.Device.Ugetinfo();

		})


		//删除好友
		$('#delete').click(function() {
			if ($('#delete').text() == '退出群组') {
				var groupname = $('#fgid').text();
				var groupid = Ctrtc.Device.Usearchgroupname(groupname); //通过groupname查找groupid
				Ctrtc.Device.Uquitgroup(groupid);
				Uunsubscribe();
				grouplist();
				listener();

			} else if ($('#delete').text() == '删除好友') {
				var username = $('#fgid').text();
				Ctrtc.Device.Udeletefriend(username);
				Ctrtc.Device.Udeletecdf(username); //删除删除好友回调
				friendlist();
				listener();
			}

		})


		//创建新的群组
		$('#btn-creategroup').click(function() {

			if (Ctrtc.Device.Ushowcontact() != null) {
				var contact = Ctrtc.Device.Ushowcontact();

				//console.log(contact.add.length);
				var n = contact.add.length;
				$('#selectfriend').html(" ");
				//alert(n);
				for (var i = 0; i < n; i++) {
					var username = contact.add[i];
					Ctrtc.Device.Uadditemtoshow(username);
				}
			}


		});

		//添加好友后隐藏模态框，具体函数点击onclick直接调用
		$('#submit-addfriend').click(function() {
			$('#myModaladdfriend').modal('hide');
		});
		//添加群组后隐藏模态框
		$('#submit-addgroup').click(function() {
			$('#myModaladdgroup').modal('hide');
		});
		//创建群组
		$('#submit-creategroup').click(function() {

			var arr = [];
			$('.selectbox').each(function() {

					if ($(this).prop('checked')) {
						var data = JSON.parse($(this).val());
						//console.log(data)
						var temp = {
							username: data.username,
							nickname: data.nickname
						}
						arr.push(temp);
					}
				})
				//console.log(arr);
			var groupname = $('#newgroup').val();
			Ctrtc.Device.Ucreategroup(arr, groupname);
			grouplist();
			listener();
			$('#myModalcreategroup').modal('hide');
		})


		//搜索群组
		$('#submit-searchgroup').click(function() {
			var groupname = $('#searchgroup').val();
			var groupid = Ctrtc.Device.Usearchgroupname(groupname); //通过groupname查找groupid
			Ctrtc.Device.Ushowgroupinfo(groupid);
			//$('#myModalsearchfriend').modal('hide');
		});

		//修改群组名
		$('#submit-changegroupinfo').click(function() {
			var rename = $('#changegroupname').val();
			var groupname = $('#fgid').text();
			$('#fgid').text(rename);
			var groupid = Ctrtc.Device.Usearchgroupname(groupname); //通过groupname查找groupid
			Ctrtc.Device.Urenamegroup(groupid, rename);
			grouplist();
			listener();
			$('.contact').after(' ');
			$('.contact').after('<div class="alert alert-success">修改信息成功</div>');
			$('myModalchangegroupinfo').modal('hide');
		})


		//邀请好友加入群组
		$('#invitetogroup').click(function() {
			if (Ctrtc.Device.Ushowcontact() != null) {
				var contact = Ctrtc.Device.Ushowcontact();

				//console.log(contact.add.length);
				var n = contact.add.length;
				$('#selectfriend2').html(" ");

				for (var i = 0; i < n; i++) {
					var username = contact.add[i];
					Ctrtc.Device.Uadditemtoshow2(username);
				}
			}
		})


		$('#submit-invitetogroup').click(function() {
			var arr = [];
			$('.selectbox2').each(function() {

					if ($(this).prop('checked')) {
						var data = JSON.parse($(this).val());
						//console.log(data)
						var temp = {
							username: data.username,
							nickname: data.nickname
						}
						arr.push(temp);
					}
				})
				//console.log(arr);


			var groupname = $('#fgid').text();
			var groupid = Ctrtc.Device.Usearchgroupname(groupname); //通过groupname查找groupid
			Ctrtc.Device.Uinvitetogroup(arr, groupid);
			$('#myModalinvitetogroup').modal('hide');
		})


		//将好友踢出群组
		$('#kickfromgroup').click(function() {
			var groupname = $('#fgid').text();
			var groupid = Ctrtc.Device.Usearchgroupname(groupname); //通过groupname查找groupid
			var contact = Ctrtc.Device.Ushowgroupinfo(groupid);
			if (contact != null) {

				var n = contact.add.length;
				$('#selectfriend3').html(" ");

				for (var i = 0; i < n; i++) {
					var username = contact.add[i];

					Ctrtc.Device.Uadditemtoshow3(username);
				}
			}

		})

		$('#submit-kickfromgroup').click(function() {
			var groupname = $('#fgid').text();
			var kickname;
			$('.selectbox3').each(function() {

				if ($(this).prop('checked')) {
					var data = JSON.parse($(this).val());
					kickname = data.username;
				}
			})

			var groupid = Ctrtc.Device.Usearchgroupname(groupname); //通过groupname查找groupid
			Ctrtc.Device.Uremovefromgroup(kickname, groupid);
			Ctrtc.Device.Udeleterfg(kickname, groupid);
			$('#myModalkickfromgroup').modal('hide');
		})

	})