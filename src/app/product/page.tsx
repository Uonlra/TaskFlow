import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import styles from "./product.module.css";
import { BrandMark } from "@/shared/components/layout/brand-mark";

export const metadata: Metadata = {
  title: "U's Task | Personal workspace",
  description: "U's Task 是一个围绕当下行动设计的 Personal workspace，集中管理任务、截止风险与完成进度。",
};

const focusTasks = [
  { title: "完成产品页首屏", meta: "今天到期", tone: "high" },
  { title: "整理本周学习计划", meta: "进行中", tone: "active" },
  { title: "复盘 React 项目", meta: "明天", tone: "normal" },
] as const;

const featurePoints = [
  {
    index: "01",
    title: "先看见今天最重要的事",
    description: "U's Task 把优先级、截止时间和任务状态汇集在一个视图里。打开工作台，不再从一长串清单里重新判断。",
  },
  {
    index: "02",
    title: "让临期风险提前出现",
    description: "当天到期、未来三天截止和已经逾期的任务都有清晰信号，让时间真正参与任务排序。",
  },
  {
    index: "03",
    title: "把推进变成看得见的反馈",
    description: "完成趋势、状态分布和标签统计帮助你回顾节奏，而不是只关注尚未完成的数量。",
  },
] as const;

export default function ProductPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/product" aria-label="U's Task 产品首页">
          <BrandMark className={styles.brandMark} />
          <span className={styles.brandCopy}>
            <span>U&apos;s Task</span>
            <small>Personal workspace</small>
          </span>
        </Link>

        <nav className={styles.navigation} aria-label="产品页导航">
          <Link className={styles.navLink} href="#workflow">
            工作方式
          </Link>
          <Link className={styles.navLink} href="/login">
            登录
          </Link>
          <Link className={styles.primaryNavAction} href="/register">
            免费开始
          </Link>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="product-hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>为个人节奏而设计</p>
          <h1 id="product-hero-title">
            把下一步，
            <br />
            变得<span>清楚。</span>
          </h1>
          <p className={styles.heroDescription}>
            U&apos;s Task 将任务、截止风险和进度集中在一个轻量工作台。每次打开，都能直接回到现在最值得推进的事情。
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/register">
              免费开始
              <span aria-hidden="true">→</span>
            </Link>
            <Link className={styles.secondaryAction} href="#preview">
              查看产品
            </Link>
          </div>
          <p className={styles.heroNote}>无需复杂配置，未连接云端时也可在本地直接使用。</p>
        </div>

        <div className={styles.heroVisual} aria-label="U's Task 今日任务预览">
          <div className={styles.previewWindow}>
            <div className={styles.previewHeader}>
              <div>
                <span className={styles.previewKicker}>8 月 17 日</span>
                <strong>今天先做什么</strong>
              </div>
              <span className={styles.progressValue}>3 / 5</span>
            </div>

            <div className={styles.progressTrack} aria-hidden="true">
              <span />
            </div>

            <div className={styles.taskList}>
              {focusTasks.map((task, index) => (
                <div className={styles.taskRow} key={task.title}>
                  <span
                    className={`${styles.taskCheck} ${index === 1 ? styles.taskCheckActive : ""}`}
                    aria-hidden="true"
                  >
                    {index === 1 ? "✓" : ""}
                  </span>
                  <span className={styles.taskCopy}>
                    <strong>{task.title}</strong>
                    <small>{task.meta}</small>
                  </span>
                  <span className={`${styles.taskSignal} ${styles[task.tone]}`} aria-hidden="true" />
                </div>
              ))}
            </div>

            <div className={styles.previewFooter}>
              <span>今日完成率</span>
              <strong>60%</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.promise} aria-label="U's Task 核心价值">
        <p>记录任务</p>
        <span aria-hidden="true">→</span>
        <p>识别风险</p>
        <span aria-hidden="true">→</span>
        <p>专注行动</p>
        <span aria-hidden="true">→</span>
        <p>回顾进度</p>
      </section>

      <section className={styles.productPreview} id="preview" aria-labelledby="preview-title">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>一个工作台，四种视角</p>
          <h2 id="preview-title">
            不只是保存任务，
            <br />
            更重要的是看见行动信号。
          </h2>
        </div>

        <div className={styles.screenshotFrame}>
          <div className={styles.browserBar} aria-hidden="true">
            <span />
            <span />
            <span />
            <p>U&apos;s Task / 总览</p>
          </div>
          <Image
            className={styles.dashboardImage}
            src="/../docs/screenshots/dashboard.png"
            alt="U's Task 总览页面，展示今日任务、完成进度、趋势和截止风险"
            width={2559}
            height={1274}
            priority
          />
        </div>
      </section>

      <section className={styles.workflow} id="workflow" aria-labelledby="workflow-title">
        <div className={styles.workflowHeading}>
          <p className={styles.eyebrow}>保持简单</p>
          <h2 id="workflow-title">
            从记录到完成，
            <br />
            每一步都有明确反馈。
          </h2>
        </div>

        <div className={styles.featureList}>
          {featurePoints.map((feature) => (
            <article className={styles.featureItem} key={feature.index}>
              <span>{feature.index}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.detailBand} aria-labelledby="detail-title">
        <div className={styles.detailCopy}>
          <p className={styles.eyebrow}>专注，而不失去上下文</p>
          <h2 id="detail-title">任务详情与列表，始终在同一个工作流里。</h2>
          <p>快速筛选、查看详情、更新状态。桌面端适合持续处理，移动端则保留最关键的信息和操作。</p>
          <Link href="/register">
            创建我的任务本
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className={styles.detailImageWrap}>
          <Image
            className={styles.detailImage}
            src="/../docs/screenshots/tasks.png"
            alt="U's Task 任务工作台，左侧为任务列表，右侧为任务详情"
            width={2559}
            height={1274}
          />
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <p className={styles.eyebrow}>从一件事开始</p>
        <h2 id="final-cta-title">
          让今天的下一步，
          <br />
          清楚一点。
        </h2>
        <Link className={styles.primaryAction} href="/register">
          免费开始
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.brand} href="/product">
          <BrandMark className={styles.brandMark} />
          <span className={styles.brandCopy}>
            <span>U&apos;s Task</span>
            <small>Personal workspace</small>
          </span>
        </Link>
        <p>把要做的事，放在一个简单、顺手的地方。</p>
        <nav aria-label="页脚导航">
          <Link href="/login">登录</Link>
          <Link href="/register">注册</Link>
          <a href="https://github.com/Uonlra/TaskFlow" rel="noreferrer" target="_blank">
            GitHub
          </a>
        </nav>
      </footer>
    </main>
  );
}
