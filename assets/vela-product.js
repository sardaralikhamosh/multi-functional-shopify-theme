window.vela = window.vela || {};
vela.LibraryLoader = (function() {
  var types = {
    link: 'link',
    script: 'script'
  };
  var status = {
    requested: 'requested',
    loaded: 'loaded'
  };
  var cloudCdn = 'https://cdn.shopify.com/shopifycloud/';
  var libraries = {
    youtubeSdk: {
      tagId: 'youtube-sdk',
      src: 'https://www.youtube.com/iframe_api',
      type: types.script
    },
    plyrShopifyStyles: {
      tagId: 'plyr-shopify-styles',
      src: cloudCdn + 'shopify-plyr/v1.0/shopify-plyr.css',
      type: types.link
    },
    modelViewerUiStyles: {
      tagId: 'shopify-model-viewer-ui-styles',
      src: cloudCdn + 'model-viewer-ui/assets/v1.0/model-viewer-ui.css',
      type: types.link
    }
  };

  function load(libraryName, callback) {
    var library = libraries[libraryName];
    if (!library) return;
    if (library.status === status.requested) return;
    callback = callback || function() {};
    if (library.status === status.loaded) {
      callback();
      return;
    }
    library.status = status.requested;
    var tag;
    switch (library.type) {
      case types.script:
        tag = createScriptTag(library, callback);
        break;
      case types.link:
        tag = createLinkTag(library, callback);
        break;
    }
    tag.id = library.tagId;
    library.element = tag;
    var firstScriptTag = document.getElementsByTagName(library.type)[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }

  function createScriptTag(library, callback) {
    var tag = document.createElement('script');
    tag.src = library.src;
    tag.addEventListener('load', function() {
      library.status = status.loaded;
      callback();
    });
    return tag;
  }

  function createLinkTag(library, callback) {
    var tag = document.createElement('link');
    tag.href = library.src;
    tag.rel = 'stylesheet';
    tag.type = 'text/css';
    tag.addEventListener('load', function() {
      library.status = status.loaded;
      callback();
    });
    return tag;
  }

  return {
    load: load
  };
})();

vela.Variants = (function() {
  function Variants(options) {
    this.$container = options.$container;
    this.product = options.product;
    this.productSelectOption = options.productSelectOption;
    this.singleOptionSelector = options.singleOptionSelector;
    this.originalSelectorId = options.originalSelectorId;
    this.enableHistoryState = options.enableHistoryState;
    this.currentVariant = this._getVariantFromOptions();
    $(this.singleOptionSelector, this.$container).on(
      'change',
      this._onSelectChange.bind(this)
    );
  }

  Variants.prototype = _.assignIn({}, Variants.prototype, {
    _getCurrentOptions: function() {
      var currentOptions = _.map(
        $(this.singleOptionSelector, this.$container),
        function(element) {
          var $element = $(element);
          var type = $element.attr('type');
          var currentOption = {};
          if (type === 'radio' || type === 'checkbox') {
            if ($element[0].checked) {
              currentOption.value = $element.val();
              currentOption.index = $element.data('index');
              return currentOption;
            } else {
              return false;
            }
          } else {
            currentOption.value = $element.val();
            currentOption.index = $element.data('index');
            return currentOption;
          }
        }
      );
      currentOptions = _.compact(currentOptions);
      return currentOptions;
    },

    _getVariantFromOptions: function() {
      var selectedValues = this._getCurrentOptions();
      
      var variants = this.product.variants;
      var found = _.find(variants, function(variant) {
        return selectedValues.every(function(values) {
          return _.isEqual(variant[values.index], values.value);
        });
      });
      for(var i=0;i < selectedValues.length; i++ ) {
        var j = i + 1;
        $('.js-swatch-display--' + j).text(selectedValues[i].value);
      }
      return found;
    },

    _onSelectChange: function() {
      var variant = this._getVariantFromOptions();

      if ($('[data-single-option-button]', this.$container).length) {
        this._updateVariantsButton();
        if (!variant || !variant.available) {
          this._updateVariantsButtonDisabed();
          return;
        }
      }

      this.$container.trigger({
        type: 'variantChange',
        variant: variant
      });

      if (!variant) return;

      this._updateMasterSelect(variant);
      this._updateMedia(variant);
      this._updatePrice(variant);
      this._updateSKU(variant);
      this.currentVariant = variant;
      this._updateSwatchTitle(variant);

      if (this.enableHistoryState) {
        this._updateHistoryState(variant);
      }
    },

    _updateVariantsButtonDisabed: function() {
      for (var i = 2; i <= 3; i++) {
        if ($(this.productSelectOption + i, this.$container).length) {
          var isUpdate = false;
          $(this.productSelectOption + i + ' ' + this.singleOptionSelector, this.$container).each(function() {
            var $element = $(this);
            var type = $element.attr('type');
            if (type === 'radio' || type === 'checkbox') {
              if (this.checked && $element.hasClass('disabled')) {
                $element.prop('checked', false);
                isUpdate = true;
                return false;
              }
            }
          });
          $(this.productSelectOption + i + ' ' + this.singleOptionSelector, this.$container).each(function() {
            var $element = $(this);
            var type = $element.attr('type');
            if (isUpdate && (type === 'radio' || type === 'checkbox') && !$element.hasClass('disabled')) {
              $element.prop('checked', true);
              isUpdate = false;
              $element.trigger('change');
              return false;
            }
          });
        }
      }
    },

    _updateVariantsButton: function() {
      // DUCHV: To disable unavailable variants
      var selectedValues = this._getCurrentOptions();
      var variants = this.product.variants;

      for (var i = 2; i <= 3; i++) {
        if ($(this.productSelectOption + i, this.$container).length) {
          $(this.productSelectOption + i + ' ' + this.singleOptionSelector, this.$container).each(function() {
            var $self = $(this);
            var optionValue = $self.val();
            var foundIndex;
            if (i === 2) {
              foundIndex = _.findIndex(variants, function(variant) {
                return variant.option1 === selectedValues[0].value &&
                  variant.option2 === optionValue &&
                  variant.available === true;
              });
            } else if (i === 3) {
              foundIndex = _.findIndex(variants, function(variant) {
                return variant.option1 === selectedValues[0].value &&
                variant.option2 === selectedValues[1].value &&
                  variant.option3 === optionValue &&
                  variant.available === true;
              });
            }
            if (foundIndex !== -1) {
              $self.removeAttr('disabled', 'disabled').removeClass('disabled');
              $self.next('label').removeClass('disabled');
            } else {
              $self.attr('disabled', 'disabled').addClass('disabled');
              $self.next('label').addClass('disabled');
            }
          });
        }
      }
    },

    _updateMedia: function(variant) {
      var variantMedia = variant.featured_media || {};
      var currentVariantMedia = this.currentVariant.featured_media || {};
      var isMatchingPreviewImage = false;
      if (variantMedia.preview_image && currentVariantMedia.preview_image) {
        isMatchingPreviewImage =
          variantMedia.preview_image.src ===
          currentVariantMedia.preview_image.src;
      }
      if (!variant.featured_media || isMatchingPreviewImage) return;
      this.$container.trigger({
        type: 'variantMediaChange',
        variant: variant
      });
    },

    _updatePrice: function(variant) {
      if (
        variant.price === this.currentVariant.price &&
        variant.compare_at_price === this.currentVariant.compare_at_price
      ) {
        return;
      }

      this.$container.trigger({
        type: 'variantPriceChange',
        variant: variant
      });
    },

    _updateSKU: function(variant) {
      if (variant.sku === this.currentVariant.sku) {
        return;
      }

      this.$container.trigger({
        type: 'variantSKUChange',
        variant: variant
      });
    },
    _updateSwatchTitle: function() {   
      for(var i=1;i <= 3; i++ ) {
        $('.js-swatch-display--' + i).text(this.currentVariant['option' + i]);
       
      }
    },
    _updateHistoryState: function(variant) {
      if (!history.replaceState || !variant) {
        return;
      }
      var newurl =
        window.location.protocol +
        '//' +
        window.location.host +
        window.location.pathname +
        '?variant=' +
        variant.id;
      window.history.replaceState(
        {
          path: newurl
        },
        '',
        newurl
      );
    },

    _updateMasterSelect: function(variant) {
      $(this.originalSelectorId, this.$container).val(variant.id);
    }
  });

  return Variants;
})();

vela.ProductModel = (function() {
  var modelJsonSections = {};
  var models = {};
  var xrButtons = {};
  var selectors = {
    productMediaGroup: '.js-product-media-group',
    productMediaGroupWrapper: '.js-product-single-media',
    xrButton: '[data-shopify-xr]',
    xrButtonSingle: '[data-shopify-xr-single]'
  };

  var classes = {
    viewInSpaceDisabled: 'product-single__view-in-space--disabled'
  };

  function init(modelViewerContainers, sectionId) {
    modelJsonSections[sectionId] = {
      loaded: false
    };

    modelViewerContainers.each(function(index) {
      var $modelViewerContainer = $(this);
      var mediaId = $modelViewerContainer.data('media-id');
      var $modelViewerElement = $(
        $modelViewerContainer.find('model-viewer')[0]
      );
      var modelId = $modelViewerElement.data('model-id');

      if (index === 0) {
        var $xrButton = $modelViewerContainer
          .closest(selectors.productMediaGroupWrapper)
          .find(selectors.xrButtonSingle);

        xrButtons[sectionId] = {
          $element: $xrButton,
          defaultId: modelId
        };
      }

      models[mediaId] = {
        modelId: modelId,
        sectionId: sectionId,
        $container: $modelViewerContainer,
        $element: $modelViewerElement
      };
    });

    window.Shopify.loadFeatures([
      {
        name: 'shopify-xr',
        version: '1.0',
        onLoad: setupShopifyXr
      }
    ]);

    if (models.length < 1) return;
    window.Shopify.loadFeatures([
      {
        name: 'model-viewer-ui',
        version: '1.0',
        onLoad: setupModelViewerUi
      }
    ]);
    vela.LibraryLoader.load('modelViewerUiStyles');
  }

  function setupShopifyXr(errors) {
    if (errors) return;
    if (!window.ShopifyXR) {
      document.addEventListener('shopify_xr_initialized', function(event) {
        if (event.detail.shopifyXREnabled) {
          setupShopifyXr();
        } else {
          $(selectors.xrButton).addClass(classes.viewInSpaceDisabled);
        }
      });
      return;
    }

    for (var sectionId in modelJsonSections) {
      if (modelJsonSections.hasOwnProperty(sectionId)) {
        var modelSection = modelJsonSections[sectionId];
        if (modelSection.loaded) continue;
        var $modelJson = $('#ModelJson-' + sectionId);
        window.ShopifyXR.addModels(JSON.parse($modelJson.html()));
        modelSection.loaded = true;
      }
    }
    window.ShopifyXR.setupXRElements();
  }

  function setupModelViewerUi(errors) {
    if (errors) return;
    for (var key in models) {
      if (models.hasOwnProperty(key)) {
        var model = models[key];
        if (!model.modelViewerUi) {
          model.modelViewerUi = new Shopify.ModelViewerUI(model.$element);
        }
        setupModelViewerListeners(model);
      }
    }
  }

  function setupModelViewerListeners(model) {
    var xrButton = xrButtons[model.sectionId];
    var $productMediaGroup = model.$container.closest(
      selectors.productMediaGroup
    );

    model.$element
      .on('shopify_model_viewer_ui_toggle_play', function() {
        vela.updateSlickSwipe($productMediaGroup, false);
      })
      .on('shopify_model_viewer_ui_toggle_pause', function() {
        vela.updateSlickSwipe($productMediaGroup, true);
      });

    model.$container.on('mediaVisible', function() {
      xrButton.$element.attr('data-shopify-model3d-id', model.modelId);
      model.modelViewerUi.play();
    });

    model.$container
      .on('mediaHidden', function() {
        xrButton.$element.attr('data-shopify-model3d-id', xrButton.defaultId);
        model.modelViewerUi.pause();
      })
      .on('xrLaunch', function() {
        model.modelViewerUi.pause();
      });
  }

  function removeSectionModels(sectionId) {
    for (var key in models) {
      if (models.hasOwnProperty(key)) {
        var model = models[key];
        if (model.sectionId === sectionId) {
          models[key].modelViewerUi.destroy();
          delete models[key];
        }
      }
    }
    delete modelJsonSections[sectionId];
  }

  return {
    init: init,
    removeSectionModels: removeSectionModels
  };
})();

function onYouTubeIframeAPIReady() {
  vela.ProductVideo.loadVideos(vela.ProductVideo.hosts.youtube);
}

vela.ProductVideo = (function() {
  var videos = {};
  var hosts = {
    html5: 'html5',
    youtube: 'youtube'
  };
  var selectors = {
    productMediaWrapper: '.js-product-media',
    productMediaGroup: '.js-product-media-group',
  };
  var attributes = {
    enableVideoLooping: 'enable-video-looping',
    videoId: 'video-id'
  };

  function init(videoContainer, sectionId) {
    if (!videoContainer.length) {
      return;
    }
    var videoElement = videoContainer.find('iframe, video')[0];
    var mediaId = videoContainer.data('mediaId');
    if (!videoElement) {
      return;
    }
    videos[mediaId] = {
      mediaId: mediaId,
      sectionId: sectionId,
      host: hostFromVideoElement(videoElement),
      container: videoContainer,
      element: videoElement,
      ready: function() {
        createPlayer(this);
      }
    };
    var video = videos[mediaId];
    switch (video.host) {
      case hosts.html5:
        window.Shopify.loadFeatures([
          {
            name: 'video-ui',
            version: '1.1',
            onLoad: setupPlyrVideos
          }
        ]);
        vela.LibraryLoader.load('plyrShopifyStyles');
        break;
      case hosts.youtube:
        vela.LibraryLoader.load('youtubeSdk');
        break;
    }
  }

  function setupPlyrVideos(errors) {
    if (errors) {
      fallbackToNativeVideo();
      return;
    }
    loadVideos(hosts.html5);
  }

  function createPlayer(video) {
    if (video.player) {
      return;
    }
    var productMediaWrapper = video.container.closest(
      selectors.productMediaWrapper
    );
    var enableLooping = productMediaWrapper.data(attributes.enableVideoLooping);
    switch (video.host) {
      case hosts.html5:
        video.player = new Shopify.Plyr(video.element, {
          loop: { active: enableLooping }
        });
        var $productMediaGroup = $(video.container).closest(
          selectors.productMediaGroup
        );
        video.player.on('seeking', function() {
          vela.updateSlickSwipe($productMediaGroup, false);
        });
        video.player.on('seeked', function() {
          vela.updateSlickSwipe($productMediaGroup, true);
        });
        break;
      case hosts.youtube:
        var videoId = productMediaWrapper.data(attributes.videoId);
        video.player = new YT.Player(video.element, {
          videoId: videoId,
          events: {
            onStateChange: function(event) {
              if (event.data === 0 && enableLooping) event.target.seekTo(0);
            }
          }
        });
        break;
    }

    productMediaWrapper.on('mediaHidden xrLaunch', function() {
      if (!video.player) return;
      if (video.host === hosts.html5) {
        video.player.pause();
      }
      if (video.host === hosts.youtube && video.player.pauseVideo) {
        video.player.pauseVideo();
      }
    });

    productMediaWrapper.on('mediaVisible', function() {
      if (!video.player) return;
      if (video.host === hosts.html5) {
        video.player.play();
      }
      if (video.host === hosts.youtube && video.player.playVideo) {
        video.player.playVideo();
      }
    });
  }

  function hostFromVideoElement(video) {
    if (video.tagName === 'VIDEO') {
      return hosts.html5;
    }
    if (video.tagName === 'IFRAME') {
      if (
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtube-nocookie\.com|youtu\.?be)\/.+$/.test(
          video.src
        )
      ) {
        return hosts.youtube;
      }
    }
    return null;
  }

  function loadVideos(host) {
    for (var key in videos) {
      if (videos.hasOwnProperty(key)) {
        var video = videos[key];
        if (video.host === host) {
          video.ready();
        }
      }
    }
  }

  function fallbackToNativeVideo() {
    for (var key in videos) {
      if (videos.hasOwnProperty(key)) {
        var video = videos[key];
        if (video.nativeVideo) continue;
        if (video.host === hosts.html5) {
          video.element.setAttribute('controls', 'controls');
          video.nativeVideo = true;
        }
      }
    }
  }

  function removeSectionVideos(sectionId) {
    for (var key in videos) {
      if (videos.hasOwnProperty(key)) {
        var video = videos[key];
        if (video.sectionId === sectionId) {
          if (video.player) video.player.destroy();
          delete videos[key];
        }
      }
    }
  }

  return {
    init: init,
    hosts: hosts,
    loadVideos: loadVideos,
    removeSectionVideos: removeSectionVideos
  };
})();

// PRODUCT SECTION
vela.Product = (function() {
  function Product(container) {
    var $window = $(window);
    var $container = (this.$container = $(container));
    var sectionId = $container.attr('data-section-id');

    this.settings = {
      productPageLoad: false,
      preloadImage: false,
      enableHistoryState: $container.data('enable-history-state'),
      namespace: '.productSection',
      sectionId: sectionId
    };

    this.selectors = {
      productMediaGroup: '.js-product-media-group',
      productMediaGroupItem: '.js-product-media-item',
      productMediaWrapper: '.js-product-media',
      productMediaTypeModel: '[data-product-media-type-model]',
      productMediaTypeVideo: '[data-product-media-type-video]',
      productThumbnails: '.js-product-thumbnails',
      productThumbnailVertical: '.product-single__media--thumbnails-vertical',
      productThumbnail: '[data-product-thumbnail]',
      productImageZoom: '[data-mfp-src]',
      meta: '.product-single__meta',
      productWrapper: '.product-single',
      productSelectOption: '.js-product-select-option--',
      originalSelectorId: '.js-product-select',
      singleOptionSelector: '.js-single-option-selector',
      slickDots: '[data-slick-dots]',
      slickNext: '[data-slick-next]',
      slickPrevious: '[data-slick-previous]',
      variantColor: '[data-color]'
    };

    this.classes = {
      hide: 'd-none',
      priceContainerUnitAvailable: 'price-container--unit-available',
      productInventoryInStock: 'product-avaiable__text--instock',
      productInventoryOutStock: 'product-avaiable__text--outstock',
    };

    this.slickMediaSettings = {
      slide: this.selectors.productMediaGroupItem,
      rows: 0,
      accessibility: true,
      arrows: true,
      appendDots: this.selectors.slickDots,
      prevArrow: this.selectors.slickPrevious,
      nextArrow: this.selectors.slickNext,
      dots: true,
      infinite: false,
      adaptiveHeight: true,
      customPaging: function(slick, index) {
        var slideA11yString = vela.strings.productSlideLabel
          .replace('[slide_number]', index + 1)
          .replace('[slide_max]', slick.slideCount);

        var mediaA11yString = $(
          '[data-slick-index="' + index + '"]',
          this.$container
        ).data('slick-media-label');

        var ariaCurrent = index === 0 ? ' aria-current="true"' : '';
        return (
          '<a href="javascript:void(0)' +
          '" aria-label="' +
          slideA11yString +
          ' ' +
          mediaA11yString +
          '" aria-controls="slick-slide0' +
          index +
          '"' +
          ariaCurrent +
          '></a>'
        );
      }.bind(this)
    };

    if (!$('#ProductJson-' + sectionId).html()) {
      return;
    }
    this.productSingleObject = JSON.parse(
      document.getElementById('ProductJson-' + sectionId).innerHTML
    );

    this.zoomType = $container.data('image-zoom-type');
    this.isStackedLayout = $container.data('stacked-layout');
    this.focusableElements = [
      'iframe',
      'input',
      'button',
      'video',
      '[tabindex="0"]'
    ].join(',');

    this.slickThumbsSettings = {
      slidesToShow: $(this.selectors.productThumbnails).data('thumbnails-show'),
      slidesToScroll: 1,
      rows: 0,
      vertical: $(this.selectors.productThumbnailVertical).length > 0?true:false,
      accessibility: true,
      infinite: false,
      focusOnSelect: true,
      adaptiveHeight: true,
      responsive:[
        {
          breakpoint: 1440,
          settings: {
            slidesToShow: 5
          }
        },
        {
            breakpoint: 1200,
            settings: {
              vertical: false,
              slidesToShow: 4
            }
        }
    ]
    };

    if (!this.isStackedLayout &&
      $(this.selectors.productMediaGroup, this.$container) &&
      $(this.selectors.productThumbnails, this.$container)) {
      this.slickMediaSettings.asNavFor = this.selectors.productThumbnails + '-' + sectionId;
      this.slickThumbsSettings.asNavFor = this.selectors.productMediaGroup + '-' + sectionId;
    }

    this.initBreakpoints();
    this.initProductVariant();
    this.initModelViewerLibraries();
    this.initShopifyXrLaunch();
    this.initProductVideo();
    if (this.zoomType) {
      this.productMediaZoom();
    }
  }

  Product.prototype = _.assignIn({}, Product.prototype, {
    initBreakpoints: function() {
      var self = this;
      enquire.register(vela.variables.mediaTablet, {
        match: function() {
          if (self.zoomType) {
            if ($(self.selectors.productImageZoom).length) {
              $(self.selectors.productImageZoom).off();
            }
          }
        },
        unmatch: function() {
          if (self.zoomType) {
            self.productMediaZoom();
          }
        }
      });

      if (!self.isStackedLayout) {
        self.createMediaCarousel();
        self.createThumbnailCarousel();
      } else {
        enquire.register(vela.variables.mediaTablet, {
          match: function() {
            self.createMediaCarousel();
          },
          unmatch: function() {
            self.destroyMediaCarousel();
          }
        });
      }
    },

    initProductVariant: function() {
      var options = {
        $container: this.$container,
        enableHistoryState: this.settings.enableHistoryState || false,
        productSelectOption: this. selectors.productSelectOption,
        singleOptionSelector: this.selectors.singleOptionSelector,
        originalSelectorId: this.selectors.originalSelectorId + '--' + this.settings.sectionId,
        product: this.productSingleObject
      };

      this.variants = new vela.Variants(options);
      this.$container.on(
        'variantChange' + this.settings.namespace,
        this.productPage.bind(this)
      );
      this.$container.on(
        'variantMediaChange' + this.settings.namespace,
        this.showVariantMedia.bind(this)
      );
    },

    initModelViewerLibraries: function() {
      if (!this.$container.data('has-model')) return;
      var $modelViewerElements = $(
        this.selectors.productMediaTypeModel,
        this.$container
      );
      vela.ProductModel.init($modelViewerElements, this.settings.sectionId);
    },

    initShopifyXrLaunch: function() {
      $(document).on(
        'shopify_xr_launch',
        function() {
          var $currentMedia = $(
            this.selectors.productMediaWrapper +
              ':not(.' +
              this.classes.hide +
              ')',
            this.$container
          );
          $currentMedia.trigger('xrLaunch');
        }.bind(this)
      );
    },

    initProductVideo: function() {
      var sectionId = this.settings.sectionId;

      $(this.selectors.productMediaTypeVideo, this.$container).each(function() {
        var $videoContainer = $(this);
        vela.ProductVideo.init($videoContainer, sectionId);
      });
    },

    trapCarouselFocus: function($slider, removeFocusTrap) {
      if (!$slider) return;

      $slider
        .find('.slick-slide:not(.slick-active)')
        .find(this.focusableElements)
        .attr('tabindex', removeFocusTrap ? '0' : '-1');

      $slider
        .find('.slick-active')
        .find(this.focusableElements)
        .attr('tabindex', '0');
    },

    updateCarouselDotsA11y: function(nextSlide) {
      var $dotLinks = $(this.selectors.slickDots).find('a');
      $dotLinks
        .removeAttr('aria-current')
        .eq(nextSlide)
        .attr('aria-current', 'true');
    },

    translateCarouselDots: function(totalSlides, nextSlide, dotStyle) {
      if (totalSlides <= dotStyle.max) {
        return;
      }
      var calculatedTranslateDistance = 0;
      var maxTranslateDistance = (totalSlides - dotStyle.max) * dotStyle.width;
      if (nextSlide >= dotStyle.max - 1) {
        calculatedTranslateDistance =
          (nextSlide + 2 - dotStyle.max) * dotStyle.width;
        calculatedTranslateDistance =
          maxTranslateDistance < calculatedTranslateDistance
            ? maxTranslateDistance
            : calculatedTranslateDistance;
      }
      $(this.selectors.slickDots)
        .find('ul')
        .css('transform', 'translateX(-' + calculatedTranslateDistance + 'px)');
    },

    triggerMediaChangeEvent: function(mediaId) {
      var $otherMedia = $(this.selectors.productMediaWrapper, this.$container);
      $otherMedia.trigger('mediaHidden');

      var $newMedia = $(
        this.selectors.productMediaWrapper,
        this.$container
      ).filter('[data-media-id="' + mediaId + '"]');
      $newMedia.trigger('mediaVisible');
    },

    showVariantMedia: function(evt) {
      var variant = evt.variant;
      var variantMediaId =
        this.settings.sectionId + '-' + variant.featured_media.id;
      var $newMedia = $(
        this.selectors.productMediaWrapper +
          '[data-media-id="' +
          variantMediaId +
          '"]'
      );
      this.triggerMediaChangeEvent(variantMediaId);

      var mediaIndex;

      if (!vela.variables.isMobile && this.isStackedLayout) {
        mediaIndex = $newMedia.closest('.slick-slide').index();
        if (mediaIndex !== 0 || vela.variables.productPageLoad) {
          if (vela.variables.productPageSticky) {
            $('html, body').animate(
              {
                scrollTop: $newMedia.offset().top
              },
              250
            );
          } else {
            var currentScroll = $(document).scrollTop();
            $newMedia
              .closest(
                $(this.selectors.productMediaGroupItem, this.$container)
              )
              .prependTo(
                $(this.selectors.productMediaGroup, this.$container)
              );
            $(document).scrollTop(currentScroll);
          }
        }
      } else {
        mediaIndex = $newMedia.closest('.slick-slide').data('slick-index');
        if (_.isUndefined(mediaIndex)) {
          return;
        }
        if (mediaIndex !== 0 || vela.variables.productPageLoad) {
          $(this.selectors.productMediaGroup, this.$container).slick(
            'slickGoTo',
            mediaIndex
          );
        }
      }

      if (!vela.variables.productPageLoad) {
        vela.variables.productPageLoad = true;
      }
    },

    setFeaturedMedia: function() {
      var mediaId = $(this.selectors.productMediaGroup, this.$container)
        .find('.slick-slide.slick-current.slick-active ' + this.selectors.productMediaWrapper)
        .attr('data-media-id');
      this.triggerMediaChangeEvent(mediaId);
    },

    createMediaCarousel: function() {
      if (
        $(this.selectors.productMediaGroupItem).length < 2 ||
        !$(this.selectors.productMediaGroup, this.$container) ||
        this.isCarouselActive
      ) {
        return;
      }

      this.isCarouselActive = true;
      var dotStyle = {
        max: 9,
        width: 20
      };

      var focusTrapped = false;
      $(this.selectors.productMediaGroupItem, this.$container).on(
        'focusin',
        function() {
          if (focusTrapped) {
            return;
          }
          this.trapCarouselFocus($(this.selectors.productMediaGroup));
          focusTrapped = true;
        }.bind(this)
      );

      $(this.selectors.productMediaGroup, this.$container)
        .slick(this.slickMediaSettings)
        .on(
          'beforeChange',
          function(event, slick, currentSlide, nextSlide) {
            this.updateCarouselDotsA11y(nextSlide);
            this.translateCarouselDots(slick.slideCount, nextSlide, dotStyle);
          }.bind(this)
        )
        .on(
          'afterChange',
          function(event, slick) {
            this.trapCarouselFocus(slick.$slider);
            this.setFeaturedMedia();
          }.bind(this)
        );
    },

    destroyMediaCarousel: function() {
      if (
        !$(this.selectors.productMediaGroup, this.$container).length ||
        !this.isCarouselActive
      ) {
        return;
      }

      this.trapCarouselFocus(
        $(this.selectors.productMediaGroup, this.$container),
        true
      );

      $(this.selectors.productMediaGroup, this.$container).slick('unslick');
      this.isCarouselActive = false;
    },

    createThumbnailCarousel: function() {
      if (
        $(this.selectors.productMediaGroupItem).length < 2 ||
        !$(this.selectors.productMediaGroup, this.$container)
      ) {
        return;
      }
      $(this.selectors.productThumbnails, this.$container).slick(this.slickThumbsSettings);
    },

    productMediaZoom: function() {
      if (
        !$(this.selectors.productImageZoom, this.$container).length ||
        vela.variables.isMobile
      ) {
        return;
      }

      $(this.selectors.productImageZoom, this.$container).magnificPopup({
        type: 'image',
        mainClass: 'mfp-fade',
        closeOnBgClick: true,
        closeBtnInside: false,
        closeOnContentClick: true,
        tClose: vela.strings.zoomClose,
        removalDelay: 500,
        gallery: {
          enabled: true,
          navigateByImgClick: false,
          arrowMarkup:
            '<button title="%title%" type="button" class="mfp-arrow mfp-arrow-%dir%"><span class="mfp-chevron mfp-chevron-%dir%"></span></button>',
          tPrev: vela.strings.zoomPrev,
          tNext: vela.strings.zoomNext
        }
      });
    },

    getBaseUnit: function(variant) {
      return variant.unit_price_measurement.reference_value === 1
        ? variant.unit_price_measurement.reference_unit
        : variant.unit_price_measurement.reference_value +
            variant.unit_price_measurement.reference_unit;
    },

    productPage: function(evt) {
      var moneyFormat = vela.strings.moneyFormat;
      var variant = evt.variant;
      var translations = vela.strings;
      var selectors = {
        addToCart: '.btn--add-to-cart',
        addToCartText: '.btn--add-to-cart .btn__text',
        quantityElements: '.js-quantity-selector',
        shopifyPaymentButton: '.shopify-payment-button',
        priceContainer: '[data-price-container]',
        productPrice: '.js-product-price',
        priceA11y: '.js-product-price-a11y',
        comparePrice: '.js-product-compare-price',
        comparePriceA11y: '.js-product-compare-price-a11y',
        comparePriceWrapper: '.product-single__price--wrapper',
        productAvailable: '.js-product-avaiable',
        productAvailableText: '.js-product-avaiable-text',
        unitPrice: '[data-unit-price]',
        unitPriceBaseUnit: '[data-unit-price-base-unit]',
        SKU: '.js-variant-sku'
      };

      if (variant) {
        $(selectors.priceContainer, this.$container).removeClass(this.classes.hide);
        $(selectors.productAvailable, this.$container).removeClass(this.classes.hide);
        $(selectors.productPrice, this.$container).attr('aria-hidden', 'false');
        $(selectors.priceA11y, this.$container).attr('aria-hidden', 'false');

        if (variant.available) {
          $(selectors.addToCart, this.$container)
            .removeClass('disabled')
            .prop('disabled', false);
          $(selectors.addToCartText, this.$container).html(translations.addToCart);
          $(selectors.productAvailableText)
            .removeClass(this.classes.productInventoryOutStock)
            .addClass(this.classes.productInventoryInStock)
            .html(vela.strings.inStock);
          $(selectors.quantityElements, this.$container).removeClass(this.classes.hide);
          $(selectors.shopifyPaymentButton, this.$container).removeClass(this.classes.hide);
        } else {
          $(selectors.addToCart, this.$container)
            .addClass('disabled')
            .prop('disabled', true);
          $(selectors.addToCartText, this.$container).html(translations.soldOut);
          $(selectors.productAvailableText)
            .removeClass(this.classes.productInventoryInStock)
            .addClass(this.classes.productInventoryOutStock)
            .html(vela.strings.outStock);
          $(selectors.quantityElements, this.$container).addClass(this.classes.hide);
          $(selectors.shopifyPaymentButton, this.$container).addClass(this.classes.hide);
        }

        $(selectors.productPrice, this.$container)
          .html(vela.Currency.formatMoney(variant.price, moneyFormat))
          .removeClass(this.classes.hide);
        if (variant.compare_at_price > variant.price) {
          $(selectors.comparePrice, this.$container).html(
            vela.Currency.formatMoney(variant.compare_at_price, moneyFormat)
          );
          $(selectors.comparePriceWrapper, this.$container).removeClass(this.classes.hide);
          $(selectors.productPrice, this.$container).addClass('on-sale');
          $(selectors.comparePriceWrapper, this.$container).attr('aria-hidden', 'false');
          $(selectors.comparePriceA11y, this.$container).attr('aria-hidden', 'false');
        } else {
          $(selectors.comparePriceWrapper, this.$container)
            .addClass(this.classes.hide)
            .attr('aria-hidden', 'true');
          $(selectors.productPrice, this.$container).removeClass('on-sale');
          $(selectors.comparePrice, this.$container).html('');
          $(selectors.comparePriceA11y, this.$container).attr('aria-hidden', 'true');
        }

        if (variant.unit_price) {
          var $unitPrice = $(selectors.unitPrice, this.$container);
          var $unitPriceBaseUnit = $(
            selectors.unitPriceBaseUnit,
            this.$container
          );
          $unitPrice.html(vela.Currency.formatMoney(variant.unit_price, moneyFormat));
          $unitPriceBaseUnit.html(this.getBaseUnit(variant));
          $(selectors.priceContainer, this.$container).addClass(this.classes.priceContainerUnitAvailable);
        }
        $(selectors.SKU).html(variant.sku != '' ? variant.sku : 'N/A');
        if(vela.settings.currencies) {
          Currency.convertAll(vela.strings.currency, Currency.cookie.read());
        }
        
      } else {
        $(selectors.addToCart, this.$container)
          .addClass('disabled')
          .prop('disabled', true);
        $(selectors.addToCartText, this.$container).html(translations.unavailable);
        $(selectors.quantityElements, this.$container).addClass(this.classes.hide);
        $(selectors.shopifyPaymentButton, this.$container).addClass(this.classes.hide);
        $(selectors.priceContainer, this.$container).addClass(this.classes.hide);
        $(selectors.productAvailable, this.$container).addClass(this.classes.hide);
        $(selectors.productPrice, this.$container).attr('aria-hidden', 'true');
        $(selectors.priceA11y, this.$container).attr('aria-hidden', 'true');
        $(selectors.comparePriceWrapper, this.$container).attr('aria-hidden', 'true');
        $(selectors.comparePriceA11y, this.$container).attr('aria-hidden', 'true');
      }
    },

    onUnload: function() {
      this.$container.off(this.settings.namespace);
      vela.ProductModel.removeSectionModels(this.settings.sectionId);
      vela.ProductVideo.removeSectionVideos(this.settings.sectionId);
      if (this.isStackedLayout) {
        this.destroyMediaCarousel();
      }
    }
  });

  return Product;
})();
$(document).ready(function() {
  var sections = new vela.Sections();
  sections.register('product-template', vela.Product);
});