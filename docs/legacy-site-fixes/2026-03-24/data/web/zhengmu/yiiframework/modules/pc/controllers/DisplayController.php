<?php
namespace app\modules\pc\controllers;

use Yii;
use yii\helpers\Url;
use yii\helpers\ArrayHelper;
use yii\data\Pagination;


class DisplayController extends BaseController
{

    //商城引号页面
    public function actionWshop()
    {
        throw new \yii\web\NotFoundHttpException();
    }
	//会员入驻页面
	public function actionMember(){
	
		//SEO
        $seoData = [
            'title' => '会员入驻_' . $this->webData['web_title'],
            'keywords' => '会员入驻，会员加盟，门店，企业，供应商',
            'description' => $this->webData['web_description']
        ];
		


		 return $this->renderPartial('member', ['webData' => $this->webData, 'seoData' => $seoData]);
	}
	


   
}