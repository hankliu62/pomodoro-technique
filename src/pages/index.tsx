import AOS from 'aos';
import BTween from 'b-tween';
import React, { useCallback, useEffect, useMemo, useRef, useState, ReactPortal } from 'react';
import {
  Card,
  Tooltip,
  Breadcrumb,
  Button,
  InputNumber,
  Select,
  SelectProps,
  Checkbox,
  Badge,
} from '@hankliu/hankliu-ui';
import { BellOutlined, IconService, InfoCircleOutlined, SettingFilled } from '@hankliu/icons';
import { useRouter } from 'next/router';
import { PageTitle } from '@/constants';
import useAudio from '@/hooks/useAudio';
import { getRoutePrefix } from '@/utils/route';
import useBreadcrumb from '@/hooks/useBreadcrumb';
import classNames from 'classnames';
import { createPortal } from 'react-dom';

const MaxStrokeDashoffset = 722.2;

/**
 * 番茄工作法
 *
 * @returns
 */
export default function Index() {
  // 休息时间（分钟）
  const [restTime, setRestTime] = useState(5);
  // 工作时间（分钟）
  const [workTime, setWorkTime] = useState(25);
  // 进入番茄工作时间
  const [isWorking, setIsWorking] = useState(false);
  // 进入休息时间
  const [isResting, setIsResting] = useState(false);
  // 白噪音
  const [whiteNoise, setWhiteNoise] = useState<string>('birds.mp3');

  // 是否播放白噪音
  const [isPlayWhiteNoise, setIsPlayWhiteNoise] = useState(true);
  // 工作结束是否自动进入休息
  const [isAutoRest, setIsAutoRest] = useState(true);
  // 是否全屏
  const [isFullScreen, setIsFullScreen] = useState(true);
  // 是否成功完成番茄工作时间
  const [isSuccess, setIsSuccess] = useState(false);

  // 白噪音选项
  const whiteNoiseOptions = useMemo<SelectProps['options']>(
    () => [
      {
        label: '鸟鸣',
        value: 'birds.mp3',
      },
      {
        label: '森林',
        value: 'forest.mp4',
      },
      {
        label: '雨声',
        value: 'rain.mp3',
      },
      {
        label: '海浪',
        value: 'sea.mp3',
      },
      {
        label: '自然',
        value: 'provence.mp4',
      },
    ],
    [],
  );

  // 白噪音URL
  const audioUrl = useMemo(() => `${getRoutePrefix()}/music/${whiteNoise}`, [whiteNoise]);
  // 白噪音播放器
  const audio = useAudio(audioUrl);
  // 是否正在播放白噪音
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (audio && audio.current) {
      if (isPlayingAudio) {
        audio.current.currentTime = 0;
        audio.current.play();
      } else {
        audio.current.pause();
      }
    }
  }, [isPlayingAudio]);

  const router = useRouter();
  // 点击面包屑
  const onClickBreadcrumb = useBreadcrumb();
  const workTimer = useRef<any | undefined>(undefined);
  // 倒计时数字
  const [countDownNumber, setCountDownNumber] = useState<number>();
  const countDownNumberRef = useRef(countDownNumber);
  // 倒计时时间
  const countDownRemain = useMemo(() => {
    if (countDownNumber === undefined) {
      return '';
    }

    return (
      `${(countDownNumber / 60) | 0}`.padStart(2, '0') +
      ':' +
      `${countDownNumber % 60}`.padStart(2, '0')
    );
  }, [countDownNumber]);

  // 工作区元素
  const workContainer = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);

  const tween = useRef<BTween>();
  // SVG进度
  const [strokeDashoffset, setStrokeDashoffset] = useState(MaxStrokeDashoffset);

  /**
   * 开启Tween
   */
  const onStartTween = useCallback((duration: number) => {
    tween.current && tween.current.stop();
    setStrokeDashoffset(MaxStrokeDashoffset);
    tween.current = new BTween({
      from: {
        strokeDashoffset: MaxStrokeDashoffset,
      },
      to: {
        strokeDashoffset: 0,
      },
      duration: duration,
      easing: 'linear',
      onUpdate: (keys) => {
        setStrokeDashoffset(keys.strokeDashoffset);
      },
      onFinish: () => {
        setStrokeDashoffset(0);
      },
    });
    tween.current.start();
  }, []);

  /**
   * 开始工作
   */
  const onStartWork = useCallback(
    (auto: boolean = false) => {
      workTimer.current && clearInterval(workTimer.current);
      setIsWorking(true);
      setIsResting(false);
      setIsSuccess(false);
      setCountDownNumber(workTime * 60);
      countDownNumberRef.current = workTime * 60;

      onStartTween(countDownNumberRef.current * 1000);

      if (!auto && isFullScreen) {
        // 强制刷新下
        workContainer.current.requestFullscreen();
      }

      // 自动播放
      if (isPlayWhiteNoise && !auto && audio?.current) {
        setIsPlayingAudio(true);
      }

      workTimer.current = setInterval(() => {
        setCountDownNumber(countDownNumberRef.current - 1);
        countDownNumberRef.current -= 1;
        if (countDownNumberRef.current === 0) {
          clearInterval(workTimer.current);
          setIsWorking(false);
          if (isAutoRest) {
            onStartRest();
          } else {
            setIsSuccess(true);
          }
        }
      }, 1000);
    },
    [workTime, restTime, isAutoRest, isPlayWhiteNoise, isFullScreen],
  );

  /**
   * 开始休息
   */
  const onStartRest = useCallback(() => {
    workTimer.current && clearInterval(workTimer.current);
    setIsResting(true);
    setIsWorking(false);
    setIsSuccess(false);
    setCountDownNumber(restTime * 60);
    countDownNumberRef.current = restTime * 60;

    onStartTween(countDownNumberRef.current * 1000);

    workTimer.current = setInterval(() => {
      setCountDownNumber(countDownNumberRef.current - 1);
      countDownNumberRef.current -= 1;
      if (countDownNumberRef.current === 0) {
        clearInterval(workTimer.current);
        setIsResting(false);
        if (isAutoRest) {
          onStartWork(true);
        }
      }
    }, 1000);
  }, [restTime]);

  /**
   * 取消工作
   */
  const onCancel = useCallback(() => {
    workTimer.current && clearInterval(workTimer.current);

    setIsPlayingAudio(false);
    setIsResting(false);
    setIsWorking(false);
    setIsSuccess(false);
    setCountDownNumber(undefined);

    try {
      if (isFullScreen && document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen();
      }
    } catch (error) {}
    countDownNumberRef.current = undefined;
  }, [isFullScreen]);

  /**
   * 切换白噪音播放
   */
  const onToggleAudioPlay = useCallback(() => {
    if (isPlayWhiteNoise) {
      setIsPlayingAudio((prev) => !prev);
    }
  }, [isPlayWhiteNoise]);

  useEffect(() => {
    AOS.init();

    return () => {
      audio.current && audio.current.pause();
      tween.current && tween.current.stop();
      workTimer.current && clearInterval(workTimer.current);
    };
  }, []);

  return (
    <div className="relative w-full text-white/75">
      {!!router.query?.['with-breadcrumb'] && (
        <Breadcrumb className="!m-6 !text-base" separator="/">
          <Breadcrumb.Item>
            <a onClick={onClickBreadcrumb}>小工具集合</a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{PageTitle.split('-').pop().trim()}</Breadcrumb.Item>
        </Breadcrumb>
      )}

      <div className="relative z-20 mx-auto mt-6 w-full max-w-[1920px]" ref={container}>
        <div className="flex flex-col flex-wrap">
          {/* 基本配置 */}
          <div
            data-aos="fade-up"
            data-aos-offset="200"
            data-aos-delay="50"
            data-aos-duration="1000"
            data-aos-easing="ease-in-out"
            data-aos-mirror="true"
            data-aos-once="true"
            className="info-card group relative flex w-full flex-col content-between justify-between gap-[24px] overflow-hidden rounded-[4px] p-[24px] ease-in"
          >
            <Card bordered className="relative shadow-lg">
              <Tooltip title="基本配置">
                <div className="absolute top-0 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded bg-[#1677ff]">
                  <SettingFilled className="text-[20px] text-white" />
                </div>
              </Tooltip>
              <div className="relative flex flex-col pt-4">
                {/* 休息时间（分钟） */}
                <div className="flex flex-col justify-start">
                  <div className="flex items-center justify-start">
                    <label className="mr-4 text-xl font-medium">休息时间（分钟）</label>
                  </div>
                  <div className="mt-2 w-full">
                    <InputNumber
                      className="!w-full"
                      size="large"
                      value={restTime}
                      onChange={(val) => {
                        setRestTime(val);
                      }}
                      placeholder="请输入休息时间（分钟）"
                    />
                  </div>
                </div>

                {/* 工作时间（分钟） */}
                <div className="mt-4 flex flex-col justify-start">
                  <div className="flex items-center justify-start">
                    <label className="mr-4 text-xl font-medium">工作时间（分钟）</label>
                  </div>
                  <div className="mt-2 w-full">
                    <InputNumber
                      className="!w-full"
                      size="large"
                      value={workTime}
                      onChange={(val) => {
                        setWorkTime(val);
                      }}
                      placeholder="请输入工作时间（分钟）"
                    />
                  </div>
                </div>

                {/* 番茄配置 */}
                <div className="mt-4 flex flex-col justify-start">
                  <div className="flex items-center justify-start">
                    <label className="mr-4 text-xl font-medium">番茄配置</label>
                  </div>
                  <div className="mt-2 grid w-full grid-rows-3 gap-y-2">
                    <div className="w-full">
                      <Checkbox
                        checked={isPlayWhiteNoise}
                        onChange={(e) => setIsPlayWhiteNoise(e.target.checked)}
                      >
                        自动播放白噪音
                      </Checkbox>
                    </div>
                    <div className="w-full">
                      <Checkbox
                        checked={isFullScreen}
                        onChange={(e) => setIsFullScreen(e.target.checked)}
                      >
                        全屏
                      </Checkbox>
                    </div>
                    <div className="w-full">
                      <Checkbox
                        checked={isAutoRest}
                        onChange={(e) => setIsAutoRest(e.target.checked)}
                      >
                        自动休息
                      </Checkbox>
                    </div>
                  </div>
                </div>

                {/* 白噪音 */}
                <div className="mt-4 flex flex-col justify-start">
                  <div className="flex items-center justify-start">
                    <label className="mr-4 text-xl font-medium">白噪音</label>
                  </div>
                  <div className="mt-2 w-full">
                    <Select
                      className="w-full"
                      options={whiteNoiseOptions}
                      size="medium"
                      value={whiteNoise}
                      onChange={(value) => setWhiteNoise(value)}
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-col items-start justify-center">
                  <Button
                    loading={isWorking || isResting}
                    disabled={isWorking || isResting}
                    size="medium"
                    type="primary"
                    onClick={() => onStartWork()}
                  >
                    开始专注
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* 开始工作 */}
          {createPortal(
            <div
              className={classNames(
                'fixed bottom-0 left-0 right-0 top-0 z-[100] h-[100vh] w-[100vw] flex-col items-center justify-center transition-all duration-300',
                {
                  'bg-white': isWorking,
                  'bg-green-500': isResting || isSuccess,
                  flex: !!(isWorking || isResting || isSuccess),
                  hidden: !(isWorking || isResting || isSuccess),
                },
              )}
              ref={workContainer}
            >
              <IconService
                className={classNames(
                  'icon-music absolute left-8 top-5 cursor-pointer text-4xl text-white',
                  {
                    'opacity-60': !isPlayingAudio,
                  },
                )}
                onClick={onToggleAudioPlay}
              />
              <div className="group relative flex h-[250px] w-[250px] items-center justify-center rounded-full">
                <svg
                  width="250"
                  height="250"
                  xmlns="http://www.w3.org/2000/svg"
                  className="-rotate-90"
                >
                  <circle
                    r="115"
                    cy="125"
                    cx="125"
                    strokeWidth="20"
                    stroke={isWorking ? 'rgba(246, 95, 84, 0.2)' : 'rgba(255, 255, 255, 0.2)'}
                    fill="none"
                  ></circle>
                  <circle
                    r="115"
                    cy="125"
                    cx="125"
                    stroke={isWorking ? '#f65f54' : '#fff'}
                    strokeWidth="20"
                    strokeLinecap="round"
                    strokeDasharray={`${MaxStrokeDashoffset}`}
                    strokeDashoffset={`${strokeDashoffset}`}
                    fill="none"
                  ></circle>
                </svg>
                <div
                  className="absolute bottom-0 left-0 right-0 top-0 flex cursor-pointer items-center justify-center"
                  onClick={onCancel}
                >
                  <div
                    className={classNames('hidden text-center text-4xl group-hover:block', {
                      ['text-[#f65f54]']: isWorking,
                      ['text-white']: isResting || isSuccess,
                    })}
                  >
                    取消
                  </div>
                  <div
                    className={classNames('block text-center group-hover:hidden', {
                      'text-[#f65f54]': isWorking,
                      'text-white': isResting || isSuccess,
                      'text-5xl': isResting || isWorking,
                      'text-4xl': isSuccess,
                    })}
                  >
                    {isResting || isWorking ? countDownRemain : '成功'}
                  </div>
                </div>
              </div>

              {isSuccess && (
                <Button
                  className="absolute translate-y-[50px] !border-white !text-white hover:!bg-white/20"
                  size="large"
                  type="secondary"
                  ghost
                  onClick={() => onStartWork()}
                >
                  下一个
                </Button>
              )}
            </div>,
            document.body,
          )}

          {/* 规则说明 */}
          <div
            data-aos="fade-up"
            data-aos-offset="200"
            data-aos-delay="50"
            data-aos-duration="1000"
            data-aos-easing="ease-in-out"
            data-aos-mirror="true"
            data-aos-once="true"
            className="info-card group relative flex w-full flex-col content-between justify-between gap-[24px] overflow-hidden rounded-[4px] p-[24px] ease-in"
          >
            <Card bordered className="relative shadow-lg">
              <Tooltip title="规则说明">
                <div className="absolute top-0 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded bg-[#1677ff]">
                  <BellOutlined className="text-[20px] text-white" />
                </div>
              </Tooltip>
              <div className="relative grid grid-cols-1 gap-6 pt-4">
                <div className="text-base">
                  <blockquote className="relative mb-0 pl-6 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-sm before:bg-[#e2e3e4] before:content-['']">
                    <p className="text-[#8a8989]">
                      番茄工作法是简单易行的时间管理方法，是由弗朗西斯科·西里洛于1992年创立的一种相对于GTD更微观的时间管理方法。
                    </p>
                    <p className="text-[#8a8989]">
                      使用番茄工作法，选择一个待完成的任务，将番茄时间设为25分钟，专注工作，中途不允许做任何与该任务无关的事，直到番茄时钟响起，然后在纸上画一个X短暂休息一下（5分钟就行），每4个番茄时段多休息一会儿。
                    </p>
                    <p className="text-[#8a8989]">
                      番茄工作法极大地提高了工作的效率，还会有意想不到的成就感。
                    </p>
                  </blockquote>
                </div>
                <div className="text-base">
                  <div className="text-xl font-medium">番茄工作法有五个基本步骤：</div>
                  <ul className="m-0 mt-2 grid grid-cols-1 gap-1 p-0">
                    <li className="flex justify-start">
                      <Badge
                        className="step-badge"
                        status="processing"
                        color="#108ee9"
                        size="default"
                      />
                      <div className="ml-2">
                        每天开始的时候规划今天要完成的几项任务，将任务逐项写在列表里（或记在软件的清单里）
                      </div>
                    </li>
                    <li className="flex justify-start">
                      <Badge
                        className="step-badge"
                        status="processing"
                        color="#108ee9"
                        size="default"
                      />
                      <div className="ml-2">
                        设定你的番茄钟（定时器、软件、闹钟等），时间是25分钟。
                      </div>
                    </li>
                    <li className="flex justify-start">
                      <Badge
                        className="step-badge"
                        status="processing"
                        color="#108ee9"
                        size="default"
                      />
                      <div className="ml-2">
                        开始完成第一项任务，直到番茄钟响铃或提醒（25分钟到）。
                      </div>
                    </li>
                    <li className="flex justify-start">
                      <Badge
                        className="step-badge"
                        status="processing"
                        color="#108ee9"
                        size="default"
                      />
                      <div className="ml-2">停止工作，并在列表里该项任务后画个X。</div>
                    </li>
                    <li className="flex justify-start">
                      <Badge
                        className="step-badge"
                        status="processing"
                        color="#108ee9"
                        size="default"
                      />
                      <div className="ml-2">休息3~5分钟，活动、喝水、方便等等。</div>
                    </li>
                    <li className="flex justify-start">
                      <Badge
                        className="step-badge"
                        status="processing"
                        color="#108ee9"
                        size="default"
                      />
                      <div className="ml-2">
                        开始下一个番茄钟，继续该任务。一直循环下去，直到完成该任务，并在列表里将该任务划掉。
                      </div>
                    </li>
                    <li className="flex justify-start">
                      <Badge
                        className="step-badge"
                        status="processing"
                        color="#108ee9"
                        size="default"
                      />
                      <div className="ml-2">每四个番茄钟后，休息25分钟。</div>
                    </li>
                  </ul>
                </div>
                <div className="text-base">
                  <div className="text-xl font-medium">
                    在某个番茄钟的过程里，如果突然想起要做什么事情：
                  </div>
                  <ul className="m-0 mt-2 grid grid-cols-1 gap-1 p-0">
                    <li className="flex justify-start">
                      <Badge
                        className="must-badge"
                        status="processing"
                        color="#faad14"
                        size="default"
                      />
                      <div className="ml-2">
                        非得马上做不可的话，停止这个番茄钟并宣告它作废（哪怕还剩5分钟就结束了），去完成这件事情，之后再重新开始同一个番茄钟。
                      </div>
                    </li>
                    <li className="flex justify-start">
                      <Badge
                        className="must-badge"
                        status="processing"
                        color="#faad14"
                        size="default"
                      />
                      <div className="ml-2">
                        不是必须马上去做的话，在列表里该项任务后面标记一个逗号（表示打扰），并将这件事记在另一个列表里（比如叫“计划外事件”），然后接着完成这个番茄钟。
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* 使用说明 */}
          <div
            data-aos="fade-up"
            data-aos-offset="200"
            data-aos-delay="50"
            data-aos-duration="1000"
            data-aos-easing="ease-in-out"
            data-aos-mirror="true"
            data-aos-once="true"
            className="info-card group relative flex w-full flex-col content-between justify-between gap-[24px] overflow-hidden rounded-[4px] p-[24px] ease-in"
          >
            <Card bordered className="relative shadow-lg">
              <Tooltip title="使用说明">
                <div className="absolute top-0 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded bg-[#1677ff]">
                  <InfoCircleOutlined className="text-[20px] text-white" />
                </div>
              </Tooltip>
              <div className="relative grid grid-cols-1 gap-4 pt-4">
                <div className="text-base">数据仅供娱乐，请勿用于商业用途，责任自负。</div>
                <div className="text-base">
                  在忙碌的生活中，番茄工作法（Pomodoro
                  Technique）是一种宝贵的工作方式。这种简单而又强大的方法将工作时间划分为短暂的番茄时间段，每个番茄时间段为25分钟，然后休息5分钟。这种循环不仅可以提高工作效率，还可以帮助我们保持专注，避免疲劳和压力。
                </div>
                <div className="text-base">
                  Pomodoro Technique
                  网站旨在为您提供一个简洁而美观的工作环境，让您轻松管理您的任务，提高工作效率，享受更加充实的工作和生活。让我们一起来体验番茄工作法的魅力吧！
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
