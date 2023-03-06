import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreatePostDto } from 'src/posts/dto/create-post.dto';
import { Post as PostEntity } from 'src/posts/entity/post.entity';
import { GetCurrentUser } from 'src/lib/decorators';
import { User } from 'src/auth/entity/user.entity';
import { PostsService } from 'src/posts/posts.service';
import { AccessTokenGuard } from 'src/lib/guards';
import { TagsService } from 'src/tags/tags.service';
import { Public } from 'src/lib/decorators/public-decorator';

@Controller('api/posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Public()
  @Get('dev')
  getDevLatestPosts(): Promise<PostEntity[]> {
    return this.postsService.getRecentPosts(1);
  }

  @Public()
  @Get('project')
  getProjectLatestPosts(): Promise<PostEntity[]> {
    return this.postsService.getRecentPosts(2);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  createPost(
    @Body() createPostDto: CreatePostDto,
    @GetCurrentUser() user: User,
  ): Promise<PostEntity> {
    return this.postsService.createPost(createPostDto, user);
  }
}
