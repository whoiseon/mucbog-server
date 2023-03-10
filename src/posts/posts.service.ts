import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from 'src/posts/entity/post.entity';
import { Repository } from 'typeorm';
import { CreatePostDto } from 'src/posts/dto/create-post.dto';
import { User } from 'src/auth/entity/user.entity';
import { TagsService } from 'src/tags/tags.service';
import { CategoriesService } from 'src/categories/categories.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    private tagsService: TagsService,
    private categoryService: CategoriesService,
  ) {}

  async getPosts(): Promise<Post[]> {
    const posts = await this.postRepository.find({
      relations: ['user', 'tags', 'category'],
      select: [
        'id',
        'title',
        'description',
        'body',
        'thumbnail',
        'createdAt',
        'user',
        'tags',
      ],
      where: [{ isPrivate: true }],
      order: {
        createdAt: 'DESC',
      },
    });

    return posts;
  }

  async getRecentPosts(categoryId: number): Promise<Post[]> {
    const posts = await this.postRepository.find({
      relations: ['user', 'tags', 'category'],
      select: [
        'id',
        'title',
        'description',
        'body',
        'thumbnail',
        'createdAt',
        'user',
        'tags',
      ],
      where: [{ isPrivate: true, category: { id: categoryId } }],
      order: {
        createdAt: 'DESC',
      },
      take: 20,
    });

    return posts;
  }

  async getPostsByTag(tag: string): Promise<Post[]> {
    const posts = await this.postRepository.find({
      relations: ['user', 'tags', 'category'],
      select: [
        'id',
        'title',
        'description',
        'body',
        'thumbnail',
        'createdAt',
        'user',
        'tags',
      ],
      where: [{ isPrivate: true, tags: { name: tag } }],
      order: {
        createdAt: 'DESC',
      },
    });

    return posts;
  }

  async getPostByTitle(title: string) {
    const convertedTitle = title.replace(/-/g, '');
    const post: Post = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.tags', 'tags')
      .leftJoinAndSelect('post.category', 'category')
      .where(
        "REGEXP_REPLACE(LOWER(post.title), '[^a-zA-Z0-9???-?????????s]', '', 'g') = :convertedTitle",
        {
          convertedTitle,
        },
      )
      .getOne();

    if (!post) {
      throw new BadRequestException('Post not found');
    }

    const [prevPosts, nextPosts]: Post[][] = await Promise.all([
      this.postRepository
        .createQueryBuilder('post')
        .select(['post.title'])
        .where('post.createdAt < :postCreatedAt', {
          postCreatedAt: post.createdAt,
        })
        .orderBy('post.createdAt', 'DESC')
        .addOrderBy('post.id', 'DESC')
        .take(2)
        .getMany(),
      this.postRepository
        .createQueryBuilder('post')
        .select(['post.title'])
        .where('post.createdAt > :postCreatedAt', {
          postCreatedAt: post.createdAt,
        })
        .orderBy('post.createdAt', 'ASC')
        .addOrderBy('post.id', 'ASC')
        .take(2)
        .getMany(),
    ]);
    let prevPost = prevPosts[0];
    let nextPost = nextPosts[1];
    if (!prevPost) {
      prevPost = null;
    }
    if (!nextPost) {
      nextPost = null;
    }
    return { ...post, prevPost, nextPost };
  }

  async createPost(createPostDto: CreatePostDto, user: User): Promise<Post> {
    const { title, body, description, tags, thumbnail, categoryId } =
      createPostDto;
    const category = await this.categoryService.getCategories(categoryId);
    const post = this.postRepository.create({
      user,
      title,
      description,
      body,
      thumbnail,
      category,
    });
    const newTags = [];
    for (const tagName of tags) {
      const tag = await this.tagsService.findOrCreate(tagName);
      newTags.push(tag);
    }
    post.tags = newTags;
    try {
      await this.postRepository.save(post);
    } catch (error) {
      console.log(error);
    }

    return post;
  }
}
