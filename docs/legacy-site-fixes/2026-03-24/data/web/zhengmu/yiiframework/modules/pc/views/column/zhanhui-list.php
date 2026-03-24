<?php

use yii\helpers\Html;
use yii\helpers\Url;
use yii\helpers\StringHelper;
use app\modules\pc\services\TemplateService as template;

$this->params['webData'] = $webData;
$this->params['seoData'] = $seoData;
$this->params['channelData'] = $channelData;
$this->params['columnData'] = $columnData;
?>
<!DOCTYPE html>
<html lang="<?= Yii::$app->language ?>">
<head>
    <title><?= $seoData['title'] ?></title>
    <link href="<?= Url::toRoute('/static/image/favicon.ico') ?>" rel="shortcut icon"/>
    <meta charset="<?= Yii::$app->charset ?>">
    <meta name="author" content="fly"/>
    <meta name="keywords" content="<?= $seoData['keywords'] ?>"/>
    <meta name="description" content="<?= $seoData['description'] ?>"/>
    <meta name="renderer" content="webkit"/>
    <meta http-equiv="X-UA-Compatible" content="IE=Edge,IE=EmulateIE9,chrome=1"/>
	<meta property="og:image" content="https://www.cnzhengmu.com/static/image/ds-logo.jpg" />
    <?= Html::csrfMetaTags() ?>
    <meta http-equiv="Cache-Control" content="no-transform"/>
    <meta http-equiv="Cache-Control" content="no-siteapp"/>
    <?php if (isset($documentData['model_type']) && ($documentData['model_type'] == 'news')): ?>
        <meta property="og:type" content="news" />
        <meta property="og:title" content="<?= $documentData['title'] ?>" />
        <meta property="og:description" content="<?= !empty($documentData['seo_description']) ? $documentData['seo_description'] : '' ?>" />
        <meta property="og:image" content="<?= Url::toRoute(!empty($documentData['image']) ? $documentData['image'] : '/static/image/ilogo.jpg', 'https') ?>" />
        <meta property="og:url" content="<?= !preg_match('/^(http|https):\/\//', $documentData['pc_link']) ? 'https:' . $documentData['pc_link'] : $documentData['pc_link'] ?>" />
        <meta property="og:release_date" content="<?= date('Ymd', $documentData['create_time']) ?>" />
    <?php endif; ?>
    <?php if (isset($documentData['model_type']) && ($documentData['model_type'] == 'video' || $documentData['model_type'] == 'live')): ?>
        <meta property="og:type" content="videolist" />
        <meta property="og:title" content="<?= $documentData['title'] ?>" />
        <meta property="og:description" content="<?= !empty($documentData['seo_description']) ? $documentData['seo_description'] : '' ?>" />
        <meta property="og:image" content="<?= Url::toRoute(!empty($documentData['image']) ? $documentData['image'] : '/static/image/ilogo.jpg', 'https') ?>" />
    <?php endif; ?>
    <?php if (isset($documentData['model_type']) && ($documentData['model_type'] == 'photo')): ?>
        <meta property="og:type" content="image" />
        <meta property="og:image" content="<?= Url::toRoute(!empty($documentData['image']) ? $documentData['image'] : '/static/image/ilogo.jpg', 'https') ?>" />
    <?php endif; ?>
    <link rel="stylesheet" href="<?= Url::toRoute('/static/css/bootstrap.min.css') ?>?v=<?= date('Ymd') ?>"/>
    <link rel="stylesheet" href="<?= Url::toRoute('/static/font/fontawesome/css/all.min.css') ?>?v=<?= date('Ymd') ?>"/>
    <link rel="stylesheet" href="<?= Url::toRoute('/static/css/animate.min.css') ?>?v=<?= date('Ymd') ?>"/>
    <link rel="stylesheet" href="<?= Url::toRoute('/static/css/common.css') ?>?v=<?= date('Ymd') ?>"/>
	<link rel="stylesheet" href="<?= Url::toRoute('/static/css/newcoom.css') ?>?v=<?= date('Ymd') ?>"/>
    <script type="text/javascript">
        var webUrl = "<?= Url::toRoute('/pc') ?>";
        var mobileUrl = "<?= Url::toRoute('/mobile') ?>";
        var apiUrl = "<?= Url::toRoute('/api') ?>";
        var userUrl = "<?= Url::toRoute('/user') ?>";
    </script>
    <script type="text/javascript" src="<?= Url::toRoute('/static/js/jquery.js') ?>?v=<?= date('Ymd') ?>"></script>
    <script type="text/javascript" src="<?= Url::toRoute('/static/js/bootstrap.min.js') ?>?v=<?= date('Ymd') ?>"></script>
    <script type="text/javascript" src="<?= Url::toRoute('/static/js/bootstrap.bundle.min.js') ?>?v=<?= date('Ymd') ?>"></script>
    <script type="text/javascript" src="<?= Url::toRoute('/static/js/jquery.super-slide.js') ?>?v=<?= date('Ymd') ?>"></script>
    <script type="text/javascript" src="<?= Url::toRoute('/static/js/jquery.lazyload.js') ?>?v=<?= date('Ymd') ?>"></script>
    <script type="text/javascript" src="<?= Url::toRoute('/static/js/dialog.js') ?>?v=<?= date('Ymd') ?>"></script>
    <script type="text/javascript" src="<?= Url::toRoute('/static/js/app.js') ?>?v=<?= date('Ymd') ?>"></script>
    <script type="text/javascript" src="<?= Url::toRoute('/static/js/common.js') ?>?v=<?= date('Ymd') ?>"></script>
    <script type="text/javascript">
        $(document).ready(
            function($){
                $("img.lazyload").lazyload({
                    threshold: 200
                });
            }
        );
    </script>
	<script type="text/javascript">
	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
	window.location = "https://m.cnzhengmu.com/"; //可以换成http地址
	}
	</script>
	<script>
	(function(){
	var src = (document.location.protocol == "http:") ? "http://js.passport.qihucdn.com/11.0.1.js?fc3333973cd27818e4e6e43cd432bde4":"https://jspassport.ssl.qhimg.com/11.0.1.js?fc3333973cd27818e4e6e43cd432bde4";
	document.write('<script src="' + src + '" id="sozz"><\/script>');
	})();
	</script>
<?php if (!empty($documentData['mobile_link'])): ?>
	<script type="text/javascript">if (isMobile()) window.location.href = '<?= (!preg_match('/^(http|https):\/\//is', $documentData['mobile_link']) && strpos($documentData['mobile_link'], '//') === true) ? 'https:' . $documentData['mobile_link'] : $documentData['mobile_link'] ?>';</script>
<?php elseif (!empty($columnData['mobile_link'])): ?>
	<script type="text/javascript">if (isMobile()) window.location.href = '<?= (!preg_match('/^(http|https):\/\//is', $columnData['mobile_link']) && strpos($columnData['mobile_link'], '//') === true) ? 'https:' . $columnData['mobile_link'] : $columnData['mobile_link'] ?>';</script>
<?php endif; ?>
</head>
<link rel="stylesheet" href="/static/css/fixed.css?v=20200103"/>
<script type="text/javascript" src="/static/js/fixed.js?v=20200103"></script>
<body>
<div class="clearfix"><script type="text/javascript">getAd('HpAJpVLqLsNE4B2m');</script></div>
<?= $this->render('../tool', $this->params) ?>
<div class="clearfix"><script type="text/javascript">getAd('lkRvqu3Igy2sezsm');</script></div>
<div class="clearfix"><script type="text/javascript">getAd('IDL2DcLM3h6g3dbU');</script></div>
<div class="clearfix" style="margin-top:-15px;"><script type="text/javascript">getAd('4cxHWMmLP6vvLRR0');</script></div>
<div class="new-header" style="margin-top:320px;">
	<div class="header-nav-box">
		<div class="zmw-logo-box">
			<a href="/" class="nav-fzlink"><i class="icon header-logo"><img src="/uploads/file/20180903/logo220307924614.png" height="50"></i></a>
		</div>
		<div class="ymPublic_nav">
                <ul class="nav-content-list">
                    <li class="ymPublic_navLi on "><a href="/" class="ymPublic_navLiA navBar_liA">首页</a></li>

                    <li class="ymPublic_navLi ymPublic_navLi2 new-infnav navBar_liA" >
                        <a href="/news" class="ymPublic_navLiA infocolor">资讯</a>
						<div class="infostyle"></div>
                        <div class="ymPublic_sonMain">
                            <a href="/news/hangye/" >
								<div class="ymPublic_son new-slide">
									<p style="font-size:16px;"><span class="new-icon-xw"></span>&nbsp行业新闻</p>
									<p>整木新思路、新动向一网打尽</p>
								</div>
							</a>
							<a href="/news/jingpei">
								<div class="ymPublic_son new-slide">
									<p style="font-size:16px;"><span class="new-icon-xw"></span>&nbsp整木精配</p>
									<p>一站式配套工艺应有尽有</p>
								</div>
							</a>
							<a href="/news/qiye">
								<div class="ymPublic_son new-slide">
									<p style="font-size:16px;"><span class="new-icon-xw"></span>&nbsp企业动态</p>
									<p>创高端的形象，建一流的品牌</p>
								</div>
							</a>
							<a href="">
								<div class="ymPublic_son new-slide">
									<p style="font-size:16px;"><span class="new-icon-xw"></span>&nbsp整木攻略</p>
									<p>为您提供整木定制最新进阶攻略</p>
								</div>
							</a>
							<a href="/news/shichang">
								<div class="ymPublic_son new-slide">
									<p style="font-size:16px;"><span class="new-icon-xw"></span>&nbsp市场一线</p>
									<p>市场营销攻略、数据报告都在这里</p>
								</div>
							</a>
							<a href="/news/baoguang">
								<div class="ymPublic_son new-slide">
									<p style="font-size:16px;"><span class="new-icon-xw"></span>&nbsp维权曝光</p>
									<p>要维权？想曝光？来这儿</p>
								</div>
							</a>

                        </div>
                    </li>
                    <li class="ymPublic_navLi ymPublic_navLi2s new-clenav navBar_liA">
						<a href="/shangxueyuan" class="ymPublic_navLiA celeocolor">名人堂</a>
						<div class="celestyle"></div>
						<div class="ymPublic_sonMains">
							<a href="/shangxueyuan/lingxiu">
								<div class="ymPublic_sons new-slides">
									<p style="font-size:16px;"><span class="new-icon-xw"></span>&nbsp业界领袖</p>
									<p>整木产业发展的领航者</p>
								</div>
							</a>
							<a href="/shangxueyuan/jingying">
								<div class="ymPublic_sons new-slides">
									<p style="font-size:16px;"><span class="new-icon-xw"></span>&nbsp业内精英</p>
									<p>整木产业高级精英人才代表</p>
								</div>
							</a>
							<a href="/shangxueyuan/zhuanjia">
								<div class="ymPublic_sons new-slides">
									<p style="font-size:16px;"><span class="new-icon-xw"></span>&nbsp专家大咖</p>
									<p>整木产业行走的智库</p>
								</div>
							</a>
							<a href="/personalcolumn">
								<div class="ymPublic_sons new-slides">
									<p style="font-size:16px;"><span class="new-icon-xw"></span>&nbsp个人专栏</p>
									<p>整木产业的非典型KOL</p>
								</div>
							</a>
                        </div>
					</li>
                    <li class="ymPublic_navLi navBar_liA"><a href="/shop" class="ymPublic_navLiA ">选材中心</a></li>
					<li class="ymPublic_navLi navBar_liA zm-ziti"></li>
					<li class="ymPublic_navLi navBar_liA "><a href="/company" class="ymPublic_navLiA ">品牌榜</a></li>
					<li class="ymPublic_navLi navBar_liA zm-ziti"></li>
					<!--<li class="ymPublic_navLi navBar_liA "><a href="/live" class="ymPublic_navLiA ">直播</a></li>-->
					<li class="ymPublic_navLi navBar_liA "><a href="/wshop" class="ymPublic_navLiA ">商城</a></li>
					<li class="ymPublic_navLi navBar_liA zm-ziti"></li>
					<li class="ymPublic_navLi navBar_liA"><a href="/zhanhui" class="ymPublic_navLiA ">展会</a></li>
					<li class="ymPublic_navLi navBar_liA zm-ziti"></li>
					<li class="ymPublic_navLi navBar_liA "><a href="/recruit" class="ymPublic_navLiA ">招聘</a></li>
					<li class="ymPublic_navLi navBar_liA zm-ziti"></li>
					<li class="ymPublic_navLi navBar_liA"><a href="/specials" class="ymPublic_navLiA ">专题</a></li>
					<li class="ymPublic_navLi navBar_liA zm-ziti"></li>
					<li class="ymPublic_navLi navBar_liA">
					<i class="icon-new"></i>
						<a href="/member" class="ymPublic_navLiA vip_set">会员入驻</a>
					</li>
					<!--<li class="ymPublic_navLi navBar_liA"><a href="/design" class="ymPublic_navLiA ">整木设计周</a></li>-->
                </ul>
        </div>
		<div class="new-index-so">
			<div class="nav-content-search-center">
				<form name="searchform" id="searchform" action="/search/list" method="get" >
					<div class="nav-search-input">
						<input class="nav-search-center-input"  placeholder="关键字" type="text" id="keyword" name="keyword" autocomplete="off">
					</div>
					<a  class="icon-search" onclick="document:searchform.submit()" ><img src="/static/image/icon/sousuo.png"></a>
				</form>
			</div>
		</div>
	</div>
</div>
<link rel="stylesheet" href="<?= Url::toRoute('/static/css/new-zhanhui.css') ?>?v=<?= date('Ymd') ?>"/>

<div class="new-main">
	<div class="clearfix"><script type="text/javascript">getAd('45h2EOKyKDaA3Ofe');</script></div>
	<?php
		$columnArrayData = template::loadArrayDataByParams("service/ColumnService/function/getChildArrayDataById/params/id=" . $channelData['id'] . ":returnSelf=false");
    ?>
	<?php
		$columnChildIds = template::loadArrayDataByParams("service/ColumnService/function/getChildIdsById/params/id=" . $channelData['id'] . ":returnSelf=false");
	?>
	<?php
		$documentListData = template::loadListData("service/DocumentService/function/getListData/where/column_id in (" . implode(',', $columnChildIds) . "):status=1:is_delete=0/order/create_time DESC,id DESC/pageSize/20/assign/documentListData");
	?>
	<?php $leaderArrayData1 = array_slice($documentListData['list'], 2, 8) ?>
	<div class="exh-header">
		<div class="exh-nav new-left">
			<?php if (!empty($columnArrayData)): ?>
                    <div class="p-3 exh-nav-color"  >
                        <span class="d-block font-weight-normal mt-2 mb-3">展会导航<br/>About zh</span>
                        <hr class="mt-0 mb-1">
                        <?php $columnArrayData = array_slice($columnArrayData, 0, 13); ?>
                        <?php foreach ($columnArrayData as $key => $value): ?>
                            <a target="_blank" href="<?= $value['pc_link'] ?>" class="btn btn-outline-red font-weight-light font-s16 w-100 mt-2 mb-2 border bg-white text-red" style="border-radius: 999px !important;"><?php if (!empty($value['icon'])): ?><i class="<?= $value['icon'] ?> mr-2"></i><?php endif; ?><?= $value['short_name'] ?><i class="fa fa-angle-right ml-2"></i></a>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
				 <!--二维码开始-->
                <div class="d-flex justify-content-center text-center" style="margin-top:-25px">
                    <div class="p-3">
                        <img src="<?= Url::toRoute($webData['web_wechat_qrcode']) ?>" class="w-100">

                    </div>
                </div>
                <!--二维码结束-->
		</div>
		<div class="exh-rot new-left">
			<div class="exh-rots"><div class="clearfix"><script type="text/javascript">getAd('gPpmjTeBaIWYRVkU');</script></div></div>
			<div class="exh-rotp"><div class="clearfix"><script type="text/javascript">getAd('DLFWx03QBgRAtxKE');</script></div></div>
		</div>
		<div class="exh-recom new-left">
			<div class="exh-recom-a new-left"></div>
			<div class="exh-recom-b new-left">展会推荐</div>
			<div class="exh-recom-a new-left"></div>
			<div class="exh-recom-wz">
				<div class="exh-recom-con">
					<div class="exh-recom-img">
						<a href="<?= $documentListData['list'][0]['pc_link'] ?>" target="_blank"><img src="<?= Url::toRoute(!empty($documentListData['list'][0]['image']) ? $documentListData['list'][0]['image'] : '/static/image/ilogo.jpg') ?>"></a>
					</div>
					<a href="<?= $documentListData['list'][0]['pc_link'] ?>" target="_blank"><div class="exh-recom-title"><?= StringHelper::truncate($documentListData['list'][0]['short_title'], 10) ?></div></a>

					<?php foreach ($leaderArrayData1 as $key => $value): ?>
					<a href="<?= $value['pc_link'] ?>" target="_blank"><div class="exh-recom-article">▶&nbsp;<?= StringHelper::truncate($value['short_title'],16) ?></div></a>
					<?php endforeach; ?>
				</div>

			</div>

		</div>
	</div>
	<div class="clearfix"><script type="text/javascript">getAd('VmA8DxdbCUejnxhO');</script></div>

	<div class="the-near-future" style="height:30px">
		<div class="tnf new-left" style="width:1200px;">
			<div class="tnf-name">▶&nbsp;<?= $columnData['name'] ?></div>
		</div>
	</div>

	<?php
       $documentListDatas = template::loadListData("service/DocumentService/function/getListData/where/column_id=" . $columnData['id'] . ":status=1:is_delete=0/order/create_time DESC,id DESC/pageSize/10/assign/documentListData");
     ?>
	<?php if (!empty($documentListDatas)): ?>
	<div class="exh-article">
		<div class="exh-article-a new-left">
			<?php foreach ($documentListDatas['list'] as $key => $value): ?>
			<div class="exh-acticle-p">
				<div class="exh-article-img new-left">
					<a href="<?= $value['pc_link'] ?>" target="_blank"><img src="<?= Url::toRoute(!empty($value['image']) ? $value['image'] : '/static/image/ilogo.jpg') ?>"></a>
				</div>
				<div class="exh-article-wz new-left">
					<a href="<?= $value['pc_link'] ?>" target="_blank"><div class="article-title"><?= StringHelper::truncate($value['short_title'], 25) ?></div>
					<div class="article-time">发布时间:2019-5-2</div>
					<div class="article-conts"><?= StringHelper::truncate($value['abstract'], 145) ?></div></a>
				</div>
			</div>
			<?php endforeach; ?>
		</div>
		<div class="exh-article-b new-left">
		<div class="picMarquee-top">
			<div class="bd">
				<ul class="picList">
					<?php foreach ($adone as $k => $v): ?>
					<li>
						<div class="pic"><a  target="_blank" href="<?= $v['setting']['image']['link']?>"><img src="<?= $v['setting']['image']['url']?>" /></a></div>
					</li>
					<?php endforeach; ?>
				</ul>
			</div>
		</div>
		</div>
	</div>
	<div class="clearfix"></div>
                    <?php if ($documentListData['paginate']->totalCount > 20): ?>
                        <?php if (!empty($columnData['setting']['html']['column']['flag'])): ?>
                            <?= $pagination::widget(['pagination' => $documentListData['paginate'], 'prevPageLabel' => '<i class="fa fa-lg fa-angle-left"></i>', 'nextPageLabel' => '<i class="fa fa-lg fa-angle-right"></i>', 'hideOnSinglePage' => false, 'maxButtonCount' => 5, 'options' => ['class' => 'pagination justify-content-center mt-5 mb-5'], 'linkContainerOptions' => ['class' => 'page-item'], 'linkOptions' => ['class' => 'page-link font-weight-light'], 'disabledListItemSubTagOptions' => ['tag' => 'a', 'class' => 'page-link', 'herf' => '#'], 'urlPrefix' => $columnData['pc_link']]) ?>
                        <?php else: ?>
                            <?= yii\widgets\LinkPager::widget(['pagination' => $documentListData['paginate'], 'prevPageLabel' => '<i class="fa fa-lg fa-angle-left"></i>', 'nextPageLabel' => '<i class="fa fa-lg fa-angle-right"></i>', 'hideOnSinglePage' => false, 'maxButtonCount' => 5, 'options' => ['class' => 'pagination justify-content-center mt-5 mb-5'], 'linkContainerOptions' => ['class' => 'page-item'], 'linkOptions' => ['class' => 'page-link font-weight-light'], 'disabledListItemSubTagOptions' => ['tag' => 'a', 'class' => 'page-link', 'herf' => '#']]) ?>
                        <?php endif; ?>
                    <?php endif; ?>
	<?php endif; ?>
</div>
<script type="text/javascript">
	$(".picMarquee-top").slide({mainCell:".bd ul",autoPlay:true,effect:"topMarquee",vis:10,interTime:20});
</script>
<?= $this->render('../newzixun-footer', $this->params) ?>