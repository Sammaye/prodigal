;(function($, window, document, undefined){
	var options = {
		width 	: 960,
		height 	: 600,
		minWidth: 960,
		minHeight: 400,

		position: 'center',

		fitToView 		: false,
		spaceFromEdge 	: 35,

		overlay : {
			show: true,
			opacity: 0.4,
			onclickClose: true
		},

		tpl : {
			overlay: '<div class="prodigal_overlay"></div>',
			wrapper: '\
				<div class="prodigal_wrapper"> \
					<div class="prodigal_outer"> \
						<div class="prodigal_inner">&nbsp;</div> \
					</div> \
				</div>',
			close: '<div class="prodigal_close"><div class="close_button"><div class="close_symbol">&#215;</div><a href="#">Close</a></div></div>',

			gallery: '\
				<div class="prodigal_gallery_wrapper"> \
					<div class="prodigal_gallery_left"></div> \
					<div class="prodigal_gallery_right"></div> \
				</div>',
			sorter: '\
				<div class="prodigal_sorter"><select> \
					<option value="all">All</option> \
					<option value="images">Images</option> \
					<option value="videos">Videos</option> \
				</select></div>'
		},

		thumbs : {
			width: null,
			height: 55
		},

		sources : {
			youtube : {
				matcher : /(youtube\.com|youtu\.be)\/(watch\?v=|v\/|u\/|embed\/?)?(videoseries\?list=(.*)|[\w-]{11}|\?listType=(.*)&list=(.*)).*/i,
				url : '//www.youtube.com/embed/$3'
			},
			vimeo : {
				matcher : /(?:vimeo(?:pro)?.com)\/(?:[^\d]+)?(\d+)(?:.*)/,
				url : '//player.vimeo.com/video/$1'
			}
		},

		_overlay : null,
		_wrapper : null,
		_media  : [],

		isActive : false,
		isOpen 	 : false // TODO: Make this used
	},

	methods = {
		init : function(opts){

			opts = $.extend(true, {}, options, opts);
			return this.each(function(){
				data = $(this).data('prodigal');

				if(!data){
					// Lets assign the options to the data of the element in question
					// so we know how to operate the pop up
					$(this).data('prodigal', opts).on('click', methods.open);
				}
			});
		},

		/**
		 * Deals with destroying stuff
		 */
		destroy : function(){
			return this.each(function(){
				var $this = $(this),
				data = $this.data('prodigal');
				$(window).unbind('.prodigal');
				data.tooltip.remove();
				$this.removeData('prodigal');
			});
		},

		/**
		 * This removes the overlay and wrapper from the screen on close of the modal
		 */
		close : function(){
			// THANK YOU IE for once again forcing me to customise the way I remove stuff
			// This line is because if you just remove the wrapper on IE8 the iframe will become full screen
			if(options._wrapper){
				options._wrapper.find('.prodigal_gallery_left iframe').remove();
	
				options._overlay.remove();
				options._wrapper.remove();
	
				options._overlay = null;
				options._wrapper = null;
			}
			options.isActive = false;
		},

		open: function(e){
			e.preventDefault();
			
			if(options._wrapper != null || options._overlay != null)
				methods.close(); // Lets close any previous one

			opts = $.extend(true, {}, options, $(this).data('prodigal')); // Ensure a copy on write to not effect our static options

			if(options.isActive == false){
				options._overlay = $(opts.tpl.overlay).css({ 'opacity' : opts.overlay.opacity, 'display' : opts.overlay.show ? 'block' : 'none' }).appendTo('body');
				options._wrapper = $(opts.tpl.wrapper).css({ }).appendTo('body');

				// Add the close hooks
				if(opts.overlay.onclickClose){
					// Lets bind the close to the onlick on the overlay
					options._overlay.on('click', methods.close);
				}

				// I wanted to do something clever here that didn't require the class but it didn't go so well
				// We reset the HTML of the inner and append the close to the very top and then bind the click handler
				var close_button = $(opts.tpl.close);
				options._wrapper.find('.prodigal_inner').html('').append(close_button);
				close_button.find('.close_button').on('click', closeClickHandler);

				// Now lets append the gallery, we will worry about filling it later
				var gallery = $(opts.tpl.gallery);
				gallery.find('.prodigal_gallery_right').append($(opts.tpl.sorter).on('change', sorterChangeHandler));
				options._wrapper.find('.prodigal_inner').append(gallery);

				// We add the current options to the wrapper so that on page resize we know what to do init
				options._wrapper.data('prodigal', opts);

				// Lets find the prodigal-thumbs and add them to the dialog
				var target = $(e.target),
					lagePreviewSrc;

				$(document).find('.prodigal-thumbs').each(function(i, obj){

					var thumbnail, media_url = $(obj).attr('href'), that = $(obj);

					// We detect if this has an image in it, if so it uses the one provided
					if( that.find('img').length > 0){
						thumbnail = that.find('img').attr('src');
					}else{
						// TODO add a black box for when thumbnail is not found
					}

					// I did not add adaptive resize. Make the browser do this by defining only a height or width depending on how much you
					// wish to scale down. NOTE: make sure to scale only images close to their original measurements else this could be a CPU burden to older computers etc

					// Lets replicate the format we put into the page for the gallery thumbnails '?' + new Date().getTime()+
					image = $('<div class="image_item"><a class="prodigal_thumb" href="'+media_url + '"><img src="'+thumbnail+'"/></a></div>');
					image.data('prodigal-media-type', 'image'); // Default is type image

					// Now I want to decide if this is a video or not, if it is then lets add it's details to the data if the thumbnail
					$.each(opts.sources, function(i, obj){
						var matches = obj.matcher.exec(media_url);

						// If there are matches then it means it is a video
						if(matches != null){
							media_url = format(obj.url, matches, {});
							image.find('a').attr('href', media_url);

							// Now we add the video type so we know later on how we wish to hide/show it
							image.data('prodigal-media-type', 'video');
						}
					});

					//image.find('img').css({ width: opts.thumbs.width !== null ? opts.thumbs.width : 'auto', height: opts.thumbs.height !== null ? opts.thumbs.height : 'auto' });
					// Lets append each to the gallery itself
					options._wrapper.find('.prodigal_gallery_right').append(image.on('click', imageClickHandler));

					if(opts.thumbs.width !== null || opts.thumbs.height !== null){

						var imgEl = image.find('img'),
							originalWidth = imgEl.outerWidth(),
							originalHeight = imgEl.outerHeight();

						if(imgEl.outerHeight() > opts.thumbs.height && opts.thumbs.height !== null){
							imgEl.css({ height: opts.thumbs.height });
						}else if(imgEl.outerWidth() > opts.thumbs.width && originalHeight < opts.thumbs.height && opts.thumbs.width !== null){
							imgEl.css({ width: gallery_left.width() });
						}

						if(imgEl.outerWidth() > opts.thumbs.width && opts.thumbs.width !== null){
							imgEl.css({ width: opts.thumbs.width, height: 'auto' });
						}
					}
					
					// If the target we clicked on is the one being seen then lets select it
					if(target.parents('.prodigal-thumbs').get(0) == $(obj).get(0)){
						image.trigger('click');
						lagePreviewSrc = image.find('a').attr('href');
					}

					// Lets add this one to the options
					options._media[i] = image;
				});

				// If no images are selected and the dialog was just opened lets select the first one
				if(options._wrapper.find('.prodigal_img_selected').length <= 0){
					options._wrapper.find('.prodigal_gallery_right .prodigal_thumb').first().trigger('click');
				}
			}

			// As resize should have been triggered by the click but incase
			methods.resize(false);

			// It is now active
			options.isActive = true;
		},

		/**
		 * This deals with the resize of the modal and its gallery
		 */
		resize: function(resizeImage){
			
			if(resizeImage == null){
				resizeImage = true;
			}

			if(!options._wrapper)
				return; // It is not there!

			opts = options._wrapper.data('prodigal'); // Since this will be called from many places lets do this

			var pagexy = getPageScroll(),
				pagex = pagexy[0] != 'undefined' && pagexy[0] != null ? pagexy[0] : 0,
				pagey = pagexy[1] != 'undefined' && pagexy[1] != null ? pagexy[1] : 0;

			// This will position our dialog initially within the view
			options._wrapper.css({ top: pagey+opts.spaceFromEdge, left: pagex+opts.spaceFromEdge });

			if(opts.fitToView){
				// Make it fit to current view
				options._wrapper.css({ width: $(window).width()-(opts.spaceFromEdge*2), height: $(window).height()-(opts.spaceFromEdge*2) });

				// Now if the new size is too small lets reset it to the min size
				// If it is a static size we don't want this, maybe? I dunno
				if(parseInt(options._wrapper.css("width")) < opts.minWidth) options._wrapper.css({ width: opts.minWidth });
				if(parseInt(options._wrapper.css("height")) < opts.minHeight) options._wrapper.css({ height: opts.minHeight });

			}else{
				// Use width and height to determine render
				options._wrapper.css({ width: opts.width, height: opts.height });

				// If we are using the width and height lets judge where to put the damn thing
				switch(opts.position){
					case "center":
						options._wrapper.css({ left: Math.max(0, (($(window).width() - options._wrapper.outerWidth()) / 2) + $(window).scrollLeft()) });
						break;
					case "right":
					case "left":
					default:
						break;
				}
			}

			// Ok now lets calc the height of the large preview and center our image shall we?
			var wrapperHeight = options._wrapper.outerHeight(),
				closeHeight = options._wrapper.find('.prodigal_close').outerHeight(),
				image = options._wrapper.find('.prodigal_gallery_left img'),
				gallery_left = options._wrapper.find('.prodigal_gallery_left');

			gallery_left.css({
				height: (wrapperHeight-closeHeight)-(parseInt(gallery_left.css('paddingTop'))+parseInt(gallery_left.css('paddingBottom'))),
				lineHeight: wrapperHeight-closeHeight+"px",
				width: (options._wrapper.width()-options._wrapper.find('.prodigal_gallery_right').width())-
					(parseInt(gallery_left.css('paddingLeft'))+parseInt(gallery_left.css('paddingRight')))
			});

			if(resizeImage){
				// This centers our image since NO CSS hacks worked for me
				// These calls must be chained otherwise the margin-top will be off on resize.

				var originalWidth = image.outerWidth(),
					originalHeight = image.outerHeight();

				if(image.outerHeight() > gallery_left.height()){
					image.css({ height: gallery_left.height() });
				}else if(image.outerWidth() > gallery_left.width() && originalHeight < gallery_left.height()){
					image.css({ width: gallery_left.width() });
				}

				if(image.outerWidth() > gallery_left.width()){
					image.css({ width: gallery_left.width(), height: 'auto' });
				}

				image.css({ marginTop: ((gallery_left.height())-image.outerHeight())/2 });
			}

			// if we use an iframe then size the iframe to the left
			// This will just do nothing if there is no iframe
			options._wrapper.find('.prodigal_gallery_left iframe').css({
				height: gallery_left.height(),
				lineHeight: gallery_left.height()+"px",
				width: gallery_left.width()
			});
		}
	},

	/**
	 * This handles the click of close on elements like <a/>
	 */
	closeClickHandler = function(e){
		e.preventDefault();
		methods.close();
	},

	/**
	 * This handles the click on the thumbnail images within the gallery
	 */
	imageClickHandler = function(e){
		e.preventDefault();

		$('.prodigal_img_selected').removeClass('prodigal_img_selected');
		$(this).addClass('prodigal_img_selected');

		// If this is a video use the iframe helper for it
		if($(this).data('prodigal-media-type') !== null && $(this).data('prodigal-media-type') == 'video'){

			var iframe = $('<iframe class="prodigal-iframe" scrolling="auto" frameborder="0" allowfullscreen="" mozallowfullscreen="" \
				webkitallowfullscreen="" hspace="0" vspace="0"></iframe>');
			iframe.attr('src', $(this).find('a').attr('href'));

			options._wrapper.find('.prodigal_gallery_left').html('').append(iframe);

			methods.resize();
		}else{
			// When we append the large preview we set it to visibility hidden so it loads but isn't shown
			options._wrapper.find('.prodigal_gallery_left').html('').append(
				$('<img class="prodigal_large_preview"/>').css({ visibility: 'hidden' })
			);

			// Putting the src attribute after the load seens to make IE load bugs disappear.
			options._wrapper.find('.prodigal_large_preview').load(function(){
				methods.resize();

				// Now that everything is done we now show it, this makes for graceful animation
				$(this).css({ visibility: 'visible' });
			}).attr('src', $(this).find('a').attr('href'));
		}
	},

	/**
	 * This handles the change on the gallery sort as to whether to show all, just images or just videos
	 */
	sorterChangeHandler = function(){
		switch($(this).find(':selected').val()){
		case "all":
			options._wrapper.find('.image_item').css({ display: 'block' });
			break;
		case "images":
			options._wrapper.find('.image_item').each(function(){
				if($(this).data('prodigal-media-type') == 'image'){
					$(this).css({ display: 'block' });
				}else{
					$(this).css({ display: 'none' });
				}
			});
			break;
		case "videos":
			options._wrapper.find('.image_item').each(function(){
				if($(this).data('prodigal-media-type') == 'video'){
					$(this).css({ display: 'block' });
				}else{
					$(this).css({ display: 'none' });
				}
			});
			break;
		}
	},

	/**
	 * Shamlessly stolen from fancybox since I didn't want to code it myself
	 */
	format = function( url, rez, params ) {
		params = params || '';

		if ( $.type( params ) === "object" ) {
			params = $.param(params, true);
		}

		$.each(rez, function(key, value) {
			url = url.replace( '$' + key, value || '' );
		});

		if (params.length) {
			url += ( url.indexOf('?') > 0 ? '&' : '?' ) + params;
		}

		return url;
	};

	/**
	 * This function determines where the viewport is in relation to the page so that we can show the
	 * modal at the right position
	 *
	 * getPageScroll() by quirksmode.com
	 */
	function getPageScroll() {
		var xScroll, yScroll;
		if (self.pageYOffset) {
			yScroll = self.pageYOffset;
			xScroll = self.pageXOffset;
		} else if (document.documentElement && document.documentElement.scrollTop) {	 // Explorer 6 Strict
			yScroll = document.documentElement.scrollTop;
			xScroll = document.documentElement.scrollLeft;
		} else if (document.body) {// all other Explorers
			yScroll = document.body.scrollTop;
			xScroll = document.body.scrollLeft;
		}
		return new Array(xScroll,yScroll)
	}

	/**
	 * Lets bind the resize event to make the window nicer
	 */
	$(window).resize(function(){
		methods.resize();
	});

	/**
	 * Key bindings for all sorts of things
	 */
	$(document).on('keydown', function(e){
		if(options._wrapper!==null)
			if (e.keyCode == 27) { methods.close(); } // ESC = close window
	});


	$.fn.prodigal = function(method) {
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.prodigal' );
		}
	};
})(jQuery, window, document);